package news

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// TrendRadarReader provides read-only queries against TrendRadar's output SQLite files.
type TrendRadarReader struct {
	DataRoot string // e.g. /home/admin/trendradar/output
}

// NewTrendRadarReader validates the data root directory exists.
func NewTrendRadarReader(root string) (*TrendRadarReader, error) {
	if root == "" {
		return nil, fmt.Errorf("NEWS_DATA_ROOT is empty")
	}
	info, err := os.Stat(root)
	if err != nil {
		return nil, fmt.Errorf("NEWS_DATA_ROOT: %w", err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("NEWS_DATA_ROOT is not a directory: %s", root)
	}
	return &TrendRadarReader{DataRoot: root}, nil
}

// ListDates scans the data root for available dates (from db filenames).
// TrendRadar stores dbs as output/{type}/{date}.db (e.g. news/2025-08-04.db).
func (tr *TrendRadarReader) ListDates() ([]TRDate, error) {
	dates := make([]TRDate, 0)
	seen := map[string]*TRDate{}

	err := filepath.Walk(tr.DataRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // skip errors
		}
		if info.IsDir() || filepath.Ext(info.Name()) != ".db" {
			return nil
		}
		// filename: {date}.db (e.g. "2025-08-04.db")
		name := strings.TrimSuffix(info.Name(), ".db")
		if !looksLikeDate(name) {
			return nil
		}
		if _, ok := seen[name]; !ok {
			seen[name] = &TRDate{Date: name}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	for _, d := range seen {
		dates = append(dates, *d)
	}
	sort.Slice(dates, func(i, j int) bool { return dates[i].Date > dates[j].Date })
	return dates, nil
}

// LatestNews returns the most recent crawl's news items grouped by platform for a given date.
// If date is empty, uses today's date.
// Reads from both news/ and rss/ databases to merge hot-list and RSS feed data.
func (tr *TrendRadarReader) LatestNews(date string) ([]TRLatestGroup, error) {
	if date == "" {
		date = todayStr()
	}
	dbPaths := tr.findDBs(date)
	if len(dbPaths) == 0 {
		return nil, nil
	}

	var allGroups []TRLatestGroup
	seenPlatform := map[string]bool{}

	for _, dbPath := range dbPaths {
		db, err := openReadOnly(dbPath)
		if err != nil {
			continue
		}

		groups, err := tr.latestNewsFromDB(db)
		db.Close()
		if err != nil {
			continue
		}

		for _, g := range groups {
			if seenPlatform[g.Platform.ID] {
				for i := range allGroups {
					if allGroups[i].Platform.ID == g.Platform.ID {
						allGroups[i].Items = append(allGroups[i].Items, g.Items...)
						break
					}
				}
			} else {
				seenPlatform[g.Platform.ID] = true
				allGroups = append(allGroups, g)
			}
		}
	}
	return allGroups, nil
}

// latestNewsFromDB reads the latest crawl's items from a single database file.
func (tr *TrendRadarReader) latestNewsFromDB(db *sql.DB) ([]TRLatestGroup, error) {
	var latestCrawlTime string
	err := db.QueryRow(`SELECT crawl_time FROM crawl_records ORDER BY crawl_time DESC LIMIT 1`).Scan(&latestCrawlTime)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	rows, err := db.Query(`SELECT id, name FROM platforms WHERE is_active = 1 ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var platforms []TRPlatform
	for rows.Next() {
		var p TRPlatform
		if err := rows.Scan(&p.ID, &p.Name); err != nil {
			return nil, err
		}
		platforms = append(platforms, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	var groups []TRLatestGroup
	for _, p := range platforms {
		items, err := tr.queryNewsByPlatform(db, p.ID, latestCrawlTime)
		if err != nil {
			continue
		}
		if len(items) == 0 {
			continue
		}
		for i := range items {
			items[i].PlatformName = p.Name
		}
		groups = append(groups, TRLatestGroup{Platform: p, Items: items})
	}
	return groups, nil
}

// QueryItems searches news items by date, optional platform, and optional keyword.
// Reads from both news/ and rss/ databases and merges results.
func (tr *TrendRadarReader) QueryItems(date, platform, keyword string, limit int) ([]TRNewsItem, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	dbPaths := tr.findDBs(date)
	if len(dbPaths) == 0 {
		return nil, nil
	}

	var allItems []TRNewsItem
	for _, dbPath := range dbPaths {
		db, err := openReadOnly(dbPath)
		if err != nil {
			continue
		}
		items, err := tr.queryItemsFromDB(db, platform, keyword, limit)
		db.Close()
		if err != nil {
			continue
		}
		allItems = append(allItems, items...)
	}

	sort.Slice(allItems, func(i, j int) bool {
		if allItems[i].CrawlCount != allItems[j].CrawlCount {
			return allItems[i].CrawlCount > allItems[j].CrawlCount
		}
		return allItems[i].Rank < allItems[j].Rank
	})
	if len(allItems) > limit {
		allItems = allItems[:limit]
	}
	return allItems, nil
}

// queryItemsFromDB queries items from a single database file.
func (tr *TrendRadarReader) queryItemsFromDB(db *sql.DB, platform, keyword string, limit int) ([]TRNewsItem, error) {
	query := `
		SELECT n.id, n.title, n.platform_id, COALESCE(p.name, ''), n.rank, n.url,
		       n.first_crawl_time, n.last_crawl_time, n.crawl_count
		FROM news_items n
		LEFT JOIN platforms p ON p.id = n.platform_id
		WHERE 1=1`
	var args []any
	if platform != "" {
		query += ` AND p.name = ?`
		args = append(args, platform)
	}
	if keyword != "" {
		query += ` AND n.title LIKE ?`
		args = append(args, "%"+keyword+"%")
	}
	query += ` ORDER BY n.crawl_count DESC, n.rank ASC LIMIT ?`
	args = append(args, limit)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanNewsItems(rows)
}

// RankHistory returns the rank history curve for a specific news item.
func (tr *TrendRadarReader) RankHistory(date string, itemID string) ([]TRRankPoint, error) {
	dbPaths := tr.findDBs(date)
	if len(dbPaths) == 0 {
		return nil, nil
	}

	var allPoints []TRRankPoint
	for _, dbPath := range dbPaths {
		db, err := openReadOnly(dbPath)
		if err != nil {
			continue
		}
		rows, err := db.Query(
			`SELECT rank, crawl_time FROM rank_history WHERE news_item_id = ? ORDER BY crawl_time ASC`,
			itemID,
		)
		if err != nil {
			db.Close()
			continue
		}
		for rows.Next() {
			var p TRRankPoint
			if err := rows.Scan(&p.Rank, &p.CrawlTime); err != nil {
				continue
			}
			allPoints = append(allPoints, p)
		}
		rows.Close()
		db.Close()
	}
	return allPoints, nil
}

// ListPlatforms returns all platforms for a given date.
// Reads from both news/ and rss/ databases and merges results.
func (tr *TrendRadarReader) ListPlatforms(date string) ([]TRPlatform, error) {
	if date == "" {
		date = todayStr()
	}
	dbPaths := tr.findDBs(date)
	if len(dbPaths) == 0 {
		return nil, nil
	}

	var allPlatforms []TRPlatform
	seen := map[string]bool{}
	for _, dbPath := range dbPaths {
		db, err := openReadOnly(dbPath)
		if err != nil {
			continue
		}
		rows, err := db.Query(`SELECT id, name FROM platforms WHERE is_active = 1 ORDER BY id`)
		if err != nil {
			db.Close()
			continue
		}
		for rows.Next() {
			var p TRPlatform
			if err := rows.Scan(&p.ID, &p.Name); err != nil {
				continue
			}
			if !seen[p.ID] {
				seen[p.ID] = true
				allPlatforms = append(allPlatforms, p)
			}
		}
		rows.Close()
		db.Close()
	}
	return allPlatforms, nil
}

// TopHotItems returns the top N hottest items across platforms for digest generation.
// Uses crawl_count and average rank as a heuristic.
// Reads from both news/ and rss/ databases and merges results.
func (tr *TrendRadarReader) TopHotItems(date string, limit int) ([]TRNewsItem, error) {
	if limit <= 0 {
		limit = 30
	}
	dbPaths := tr.findDBs(date)
	if len(dbPaths) == 0 {
		return nil, nil
	}

	var allItems []TRNewsItem
	for _, dbPath := range dbPaths {
		db, err := openReadOnly(dbPath)
		if err != nil {
			continue
		}
		rows, err := db.Query(`
			SELECT n.id, n.title, n.platform_id, COALESCE(p.name, ''), n.rank, n.url,
			       n.first_crawl_time, n.last_crawl_time, n.crawl_count
			FROM news_items n
			LEFT JOIN platforms p ON p.id = n.platform_id
			ORDER BY n.crawl_count DESC, n.rank ASC
			LIMIT ?`, limit,
		)
		if err != nil {
			db.Close()
			continue
		}
		items, err := scanNewsItems(rows)
		rows.Close()
		db.Close()
		if err != nil {
			continue
		}
		allItems = append(allItems, items...)
	}

	sort.Slice(allItems, func(i, j int) bool {
		if allItems[i].CrawlCount != allItems[j].CrawlCount {
			return allItems[i].CrawlCount > allItems[j].CrawlCount
		}
		return allItems[i].Rank < allItems[j].Rank
	})
	if len(allItems) > limit {
		allItems = allItems[:limit]
	}
	return allItems, nil
}

// --- helpers ---

// findDBs returns all matching database paths for a date.
// TrendRadar stores data in output/{type}/{date}.db (e.g. news/2025-08-04.db, rss/2025-08-04.db).
// We read from both "news" and "rss" subdirectories to merge hot-list and RSS feed data.
func (tr *TrendRadarReader) findDBs(date string) []string {
	var paths []string
	for _, sub := range []string{"news", "rss", "ai_filter"} {
		candidate := filepath.Join(tr.DataRoot, sub, date+".db")
		if _, err := os.Stat(candidate); err == nil {
			paths = append(paths, candidate)
		}
	}
	if len(paths) == 0 {
		candidate := filepath.Join(tr.DataRoot, date+".db")
		if _, err := os.Stat(candidate); err == nil {
			paths = append(paths, candidate)
		}
	}
	return paths
}

func (tr *TrendRadarReader) queryNewsByPlatform(db *sql.DB, platformID string, crawlTime string) ([]TRNewsItem, error) {
	rows, err := db.Query(`
		SELECT n.id, n.title, n.platform_id, '', n.rank, n.url,
		       n.first_crawl_time, n.last_crawl_time, n.crawl_count
		FROM news_items n
		WHERE n.platform_id = ?
		ORDER BY n.rank ASC
		LIMIT 50`, platformID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanNewsItems(rows)
}

func scanNewsItems(rows *sql.Rows) ([]TRNewsItem, error) {
	items := make([]TRNewsItem, 0)
	for rows.Next() {
		var it TRNewsItem
		if err := rows.Scan(
			&it.ID, &it.Title, &it.PlatformID, &it.PlatformName,
			&it.Rank, &it.URL, &it.FirstCrawlAt, &it.LastCrawlAt, &it.CrawlCount,
		); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

func openReadOnly(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", path+"?mode=ro&_pragma=busy_timeout(3000)")
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, err
	}
	return db, nil
}

func looksLikeDate(s string) bool {
	if len(s) != 10 {
		return false
	}
	return s[4] == '-' && s[7] == '-' &&
		isDigit(s[0]) && isDigit(s[1]) && isDigit(s[2]) && isDigit(s[3]) &&
		isDigit(s[5]) && isDigit(s[6]) && isDigit(s[8]) && isDigit(s[9])
}

func isDigit(b byte) bool { return b >= '0' && b <= '9' }

func todayStr() string {
	return time.Now().In(cst()).Format("2006-01-02")
}
