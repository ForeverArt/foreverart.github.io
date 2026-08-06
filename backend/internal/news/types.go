package news

import (
	"errors"
	"time"
)

var (
	ErrUserExists      = errors.New("username already exists")
	ErrInvalidCred     = errors.New("invalid credentials")
	ErrNotFound        = errors.New("not found")
	ErrTooManyKeywords = errors.New("max 50 keywords per user")
	ErrInvalidToken    = errors.New("invalid or expired token")
)

// User represents a registered news subscriber.
type User struct {
	ID           int64
	Username     string
	CreatedAt    time.Time
}

// Keyword is a server-side subscription keyword for a user.
type Keyword struct {
	ID      int64
	UserID  int64
	Keyword string
}

// FeedToken is the capability-URL token for a user's RSS feed.
type FeedToken struct {
	UserID    int64
	Token     string
	CreatedAt time.Time
}

// Digest is a cached AI-generated daily summary.
type Digest struct {
	ID          int64     `json:"-"`
	Date        string    `json:"date"` // "2006-01-02"
	Content     string    `json:"content"` // markdown
	GeneratedAt time.Time `json:"generatedAt"`
}

// --- TrendRadar read-only types ---

// TRPlatform mirrors TrendRadar's platforms table.
type TRPlatform struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// TRNewsItem mirrors TrendRadar's news_items table.
type TRNewsItem struct {
	ID            string `json:"id"`
	Title         string `json:"title"`
	PlatformID    string `json:"platformId"`
	PlatformName  string `json:"platformName"`
	Rank          int    `json:"rank"`
	URL           string `json:"url"`
	FirstCrawlAt  string `json:"firstCrawlAt"`
	LastCrawlAt   string `json:"lastCrawlAt"`
	CrawlCount    int    `json:"crawlCount"`
}

// TRLatestGroup is a platform + its current news items for display.
type TRLatestGroup struct {
	Platform TRPlatform `json:"platform"`
	Items    []TRNewsItem `json:"items"`
}

// TRRankPoint is a single point on a news item's rank history curve.
type TRRankPoint struct {
	Rank      int    `json:"rank"`
	CrawlTime string `json:"crawlTime"`
}

// TRDate is an available data date (from directory listing).
type TRDate struct {
	Date string
	// ItemCount is approximate total news_items across platforms for that date.
	ItemCount int
}
