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

// KeywordMatchGroup is a keyword + its matched news items for subscription view.
type KeywordMatchGroup struct {
	Keyword string       `json:"keyword"`
	Items   []TRNewsItem `json:"items"`
}

// ScoredNewsItem extends TRNewsItem with preference-derived signals.
type ScoredNewsItem struct {
	TRNewsItem
	RelevanceScore   int      `json:"relevanceScore"`
	MatchedInterests []string `json:"matchedInterests"`
}

// KeywordMatchGroupEx is a keyword + its scored matched items.
type KeywordMatchGroupEx struct {
	Keyword string           `json:"keyword"`
	Items   []ScoredNewsItem `json:"items"`
}

// PreferenceDoc holds a user's structured preferences.
type PreferenceDoc struct {
	Interests       []string `json:"interests"`
	Dislikes        []string `json:"dislikes"`
	PreferredAngles []string `json:"preferredAngles"`
	Notes           string   `json:"notes"`
}

// PreferenceRecord is the stored preference row for a user+keyword.
type PreferenceRecord struct {
	ID            int64
	UserID        int64
	Keyword       string // empty = global
	PreferenceDoc string // JSON
	UpdatedAt     time.Time
}

// Conversation is a preference chat conversation.
type Conversation struct {
	ID        int64
	UserID    int64
	Keyword   string // empty = global
	CreatedAt time.Time
	UpdatedAt time.Time
}

// ConversationMessage is a single chat message.
type ConversationMessage struct {
	ID            int64
	ConversationID int64
	Role          string // "user" or "assistant"
	Content       string
	CreatedAt     time.Time
}

// Feedback records a user's explicit like/dislike on a matched item.
type Feedback struct {
	ID           int64
	UserID       int64
	NewsItemID   string
	NewsItemTitle string
	Keyword      string
	FeedbackType string // "more_like_this" or "not_interested"
	Processed    bool
	CreatedAt    time.Time
}

// AllPreferences aggregates global and per-keyword preferences.
type AllPreferences struct {
	Global   PreferenceDoc            `json:"global"`
	Keywords map[string]PreferenceDoc `json:"keywords"`
}

// UserSettings holds user-level UI preferences.
type UserSettings struct {
	ShowForeignPlatforms bool `json:"showForeignPlatforms"`
}

// TRDate is an available data date (from directory listing).
type TRDate struct {
	Date string
	// ItemCount is approximate total news_items across platforms for that date.
	ItemCount int
}
