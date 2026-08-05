package news

import (
	"encoding/xml"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// RSSHandler generates RSS 2.0 feeds for users based on their keyword subscriptions.
type RSSHandler struct {
	store *Store
	tr    *TrendRadarReader
}

// NewRSSHandler creates an RSSHandler.
func NewRSSHandler(store *Store, tr *TrendRadarReader) *RSSHandler {
	return &RSSHandler{store: store, tr: tr}
}

// ServeFeed handles GET /api/v1/news/feed/{token}.xml
func (h *RSSHandler) ServeFeed(w http.ResponseWriter, r *http.Request) {
	// Extract token from path: /api/v1/news/feed/{token}.xml
	path := r.URL.Path
	parts := strings.Split(path, "/")
	if len(parts) < 2 {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	filename := parts[len(parts)-1]
	token := strings.TrimSuffix(filename, ".xml")
	if token == "" {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	u, err := h.store.GetUserByFeedToken(token)
	if err != nil {
		http.Error(w, "invalid feed token", http.StatusNotFound)
		return
	}

	keywords, _ := h.store.GetKeywords(u.ID)
	if len(keywords) == 0 {
		// No keywords: return an empty feed with a message
		emptyFeed := buildEmptyFeed(u.Username)
		w.Header().Set("Content-Type", "application/rss+xml; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(emptyFeed))
		return
	}

	// Fetch today's and yesterday's news items
	date := todayStr()
	items, err := h.tr.QueryItems(date, "", "", 200)
	if err != nil {
		http.Error(w, "failed to query news", http.StatusInternalServerError)
		return
	}

	// Filter items matching any keyword (case-insensitive)
	var matched []TRNewsItem
	kwLower := make([]string, len(keywords))
	for i, kw := range keywords {
		kwLower[i] = strings.ToLower(kw)
	}
	for _, it := range items {
		titleLower := strings.ToLower(it.Title)
		for _, kw := range kwLower {
			if strings.Contains(titleLower, kw) {
				matched = append(matched, it)
				break
			}
		}
	}

	// Also include today's digest if available
	digest, _ := h.store.GetDigest(date)

	feed := buildFeed(u.Username, keywords, matched, digest)
	w.Header().Set("Content-Type", "application/rss+xml; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(feed))
}

// --- RSS XML types ---

type rss struct {
	XMLName xml.Name `xml:"rss"`
	Version string   `xml:"version,attr"`
	Channel channel  `xml:"channel"`
}

type channel struct {
	Title         string `xml:"title"`
	Link          string `xml:"link"`
	Description   string `xml:"description"`
	Language      string `xml:"language"`
	LastBuildDate string `xml:"lastBuildDate"`
	Items         []item `xml:"item"`
}

type item struct {
	Title       string `xml:"title"`
	Link        string `xml:"link"`
	Description string `xml:"description"`
	PubDate     string `xml:"pubDate"`
	GUID        string `xml:"guid"`
}

func buildFeed(username string, keywords []string, news []TRNewsItem, digest *Digest) string {
	ch := channel{
		Title:         fmt.Sprintf("News Radar · %s 的订阅", username),
		Link:          "https://foreverart.github.io/platforms/life-tools",
		Description:   fmt.Sprintf("关键词订阅：%s", strings.Join(keywords, ", ")),
		Language:      "zh-CN",
		LastBuildDate: time.Now().UTC().Format(time.RFC1123),
	}

	// Add digest as first item if available
	if digest != nil {
		ch.Items = append(ch.Items, item{
			Title:       fmt.Sprintf("AI 日报 · %s", digest.Date),
			Link:        "https://foreverart.github.io/platforms/life-tools#/news",
			Description: digest.Content,
			PubDate:     digest.GeneratedAt.UTC().Format(time.RFC1123),
			GUID:        fmt.Sprintf("digest-%s", digest.Date),
		})
	}

	// Add matched news items
	for _, it := range news {
		ch.Items = append(ch.Items, item{
			Title:       fmt.Sprintf("[%s] %s", it.PlatformName, it.Title),
			Link:        it.URL,
			Description: fmt.Sprintf("平台：%s · 排名：%d · 抓取次数：%d", it.PlatformName, it.Rank, it.CrawlCount),
			PubDate:     parseTimeRFC1123(it.FirstCrawlAt),
			GUID:        fmt.Sprintf("news-%d-%d", it.PlatformID, it.ID),
		})
	}

	r := rss{Version: "2.0", Channel: ch}
	out, err := xml.MarshalIndent(r, "", "  ")
	if err != nil {
		return ""
	}
	return xml.Header + string(out)
}

func buildEmptyFeed(username string) string {
	ch := channel{
		Title:         fmt.Sprintf("News Radar · %s 的订阅", username),
		Link:          "https://foreverart.github.io/platforms/life-tools",
		Description:   "你还没有设置关键词订阅。请在网页上添加关键词后刷新此 Feed。",
		Language:      "zh-CN",
		LastBuildDate: time.Now().UTC().Format(time.RFC1123),
	}
	r := rss{Version: "2.0", Channel: ch}
	out, _ := xml.MarshalIndent(r, "", "  ")
	return xml.Header + string(out)
}

func parseTimeRFC1123(s string) string {
	// TrendRadar stores times as strings; try common formats
	formats := []string{
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
		"2006-01-02T15:04:05Z",
		time.RFC3339,
	}
	for _, f := range formats {
		if t, err := time.Parse(f, s); err == nil {
			return t.UTC().Format(time.RFC1123)
		}
	}
	// Fallback: use current time
	return time.Now().UTC().Format(time.RFC1123)
}
