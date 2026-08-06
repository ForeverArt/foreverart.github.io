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
	ID          int64
	Date        string // "2006-01-02"
	Content     string // markdown
	GeneratedAt time.Time
}

// --- TrendRadar read-only types ---

// TRPlatform mirrors TrendRadar's platforms table.
type TRPlatform struct {
	ID   string
	Name string
}

// TRNewsItem mirrors TrendRadar's news_items table.
type TRNewsItem struct {
	ID            string
	Title         string
	PlatformID    string
	PlatformName  string
	Rank          int
	URL           string
	FirstCrawlAt  string
	LastCrawlAt   string
	CrawlCount    int
}

// TRLatestGroup is a platform + its current news items for display.
type TRLatestGroup struct {
	Platform TRPlatform
	Items    []TRNewsItem
}

// TRRankPoint is a single point on a news item's rank history curve.
type TRRankPoint struct {
	Rank      int
	CrawlTime string
}

// TRDate is an available data date (from directory listing).
type TRDate struct {
	Date string
	// ItemCount is approximate total news_items across platforms for that date.
	ItemCount int
}
