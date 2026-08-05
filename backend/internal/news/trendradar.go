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
	var dates []TRDate
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
func (tr *TrendRadarReader) LatestNews(date string) ([]TRLatestGroup, error) {
	if date == "" {
		date = todayStr()
	}
	dbPath := tr.findDB(date)
	if dbPath == "" {
		return nil, nil
	}
	db, err := openReadOnly(dbPath)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	// Find the latest crawl record
	var latestCrawlTime string
	err = db.QueryRow(`SELECT crawl_time FROM crawl_records ORDER BY crawl_time DESC LIMIT 1`).Scan(&latestCrawlTime)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// Get all platforms
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
			continue // skip platform on error
		}
		if len(items) == 0 {
			continue
		}
		// Attach platform name to items
		for i := range items {
			items[i].PlatformName = p.Name
		}
		groups = append(groups, TRLatestGroup{Platform: p, Items: items})
	}
	return groups, nil
}

// QueryItems searches news items by date, optional platform, and optional keyword.
func (tr *TrendRadarReader) QueryItems(date, platform, keyword string, limit int) ([]TRNewsItem, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	dbPath := tr.findDB(date)
	if dbPath == "" {
		return nil, nil
	}
	db, err := openReadOnly(dbPath)
	if err != nil {
		return nil, err
	}
	defer db.Close()

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
func (tr *TrendRadarReader) RankHistory(date string, itemID int64) ([]TRRankPoint, error) {
	dbPath := tr.findDB(date)
	if dbPath == "" {
		return nil, nil
	}
	db, err := openReadOnly(dbPath)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	rows, err := db.Query(
		`SELECT rank, crawl_time FROM rank_history WHERE news_item_id = ? ORDER BY crawl_time ASC`,
		itemID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var points []TRRankPoint
	for rows.Next() {
		var p TRRankPoint
		if err := rows.Scan(&p.Rank, &p.CrawlTime); err != nil {
			return nil, err
		}
		points = append(points, p)
	}
	return points, rows.Err()
}

// ListPlatforms returns all platforms for a given date.
func (tr *TrendRadarReader) ListPlatforms(date string) ([]TRPlatform, error) {
	if date == "" {
		date = todayStr()
	}
	dbPath := tr.findDB(date)
	if dbPath == "" {
		return nil, nil
	}
	db, err := openReadOnly(dbPath)
	if err != nil {
		return nil, err
	}
	defer db.Close()
	rows, err := db.Query(`SELECT id, name FROM platforms WHERE is_active = 1 ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ps []TRPlatform
	for rows.Next() {
		var p TRPlatform
		if err := rows.Scan(&p.ID, &p.Name); err != nil {
			return nil, err
		}
		ps = append(ps, p)
	}
	return ps, rows.Err()
}

// TopHotItems returns the top N hottest items across platforms for digest generation.
// Uses crawl_count and average rank as a heuristic.
func (tr *TrendRadarReader) TopHotItems(date string, limit int) ([]TRNewsItem, error) {
	if limit <= 0 {
		limit = 30
	}
	dbPath := tr.findDB(date)
	if dbPath == "" {
		return nil, nil
	}
	db, err := openReadOnly(dbPath)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	rows, err := db.Query(`
		SELECT n.id, n.title, n.platform_id, COALESCE(p.name, ''), n.rank, n.url,
		       n.first_crawl_time, n.last_crawl_time, n.crawl_count
		FROM news_items n
		LEFT JOIN platforms p ON p.id = n.platform_id
		ORDER BY n.crawl_count DESC, n.rank ASC
		LIMIT ?`, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanNewsItems(rows)
}

// --- helpers ---

func (tr *TrendRadarReader) findDB(date string) string {
	// Try common subdirectory names
	for _, sub := range []string{"news", "rss", "ai_filter", ""} {
		var candidate string
		if sub == "" {
			candidate = filepath.Join(tr.DataRoot, date+".db")
		} else {
			candidate = filepath.Join(tr.DataRoot, sub, date+".db")
		}
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	return ""
}

func (tr *TrendRadarReader) queryNewsByPlatform(db *sql.DB, platformID int64, crawlTime string) ([]TRNewsItem, error) {
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
	var items []TRNewsItem
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
	// basic check: YYYY-MM-DD format (10 chars, dashes at 4 and 7)
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
