package news

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)

// Store manages the news module's own SQLite database (users, keywords, digests).
type Store struct {
	db *sql.DB
}

// OpenStore opens (or creates) the news module's own database.
func OpenStore(path string) (*Store, error) {
	db, err := sql.Open("sqlite", path+"?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)")
	if err != nil {
		return nil, fmt.Errorf("open news db: %w", err)
	}
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, err
	}
	s := &Store{db: db}
	if err := s.migrate(); err != nil {
		db.Close()
		return nil, err
	}
	return s, nil
}

func (s *Store) Close() error { return s.db.Close() }

func (s *Store) migrate() error {
	_, err := s.db.Exec(`
		CREATE TABLE IF NOT EXISTS news_users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT UNIQUE NOT NULL COLLATE NOCASE,
			password_hash TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT (datetime('now'))
		);
		CREATE TABLE IF NOT EXISTS news_keywords (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL REFERENCES news_users(id) ON DELETE CASCADE,
			keyword TEXT NOT NULL,
			UNIQUE(user_id, keyword)
		);
		CREATE TABLE IF NOT EXISTS news_feed_tokens (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER UNIQUE NOT NULL REFERENCES news_users(id) ON DELETE CASCADE,
			token TEXT UNIQUE NOT NULL,
			created_at DATETIME NOT NULL DEFAULT (datetime('now'))
		);
		CREATE TABLE IF NOT EXISTS news_digests (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			date TEXT UNIQUE NOT NULL,
			content TEXT NOT NULL,
			generated_at DATETIME NOT NULL
		);
	`)
	return err
}

// CreateUser inserts a new user with the given bcrypt password hash.
func (s *Store) CreateUser(username, pwHash string) (*User, error) {
	res, err := s.db.Exec(
		`INSERT INTO news_users (username, password_hash) VALUES (?, ?)`,
		username, pwHash,
	)
	if err != nil {
		// Unique constraint on username
		if isUniqueErr(err) {
			return nil, ErrUserExists
		}
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &User{ID: id, Username: username, CreatedAt: time.Now().UTC()}, nil
}

// GetUserByName looks up a user by username (case-insensitive).
func (s *Store) GetUserByName(username string) (*User, string, error) {
	var u User
	var pwHash string
	err := s.db.QueryRow(
		`SELECT id, username, password_hash, created_at FROM news_users WHERE username = ? COLLATE NOCASE`,
		username,
	).Scan(&u.ID, &u.Username, &pwHash, &u.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, "", ErrInvalidCred
	}
	if err != nil {
		return nil, "", err
	}
	return &u, pwHash, nil
}

// GetUserByID returns a user by primary key.
func (s *Store) GetUserByID(id int64) (*User, error) {
	var u User
	err := s.db.QueryRow(
		`SELECT id, username, created_at FROM news_users WHERE id = ?`, id,
	).Scan(&u.ID, &u.Username, &u.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return &u, err
}

// SetKeywords replaces the user's server-side keyword list.
func (s *Store) SetKeywords(userID int64, keywords []string) error {
	if len(keywords) > 50 {
		return ErrTooManyKeywords
	}
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`DELETE FROM news_keywords WHERE user_id = ?`, userID); err != nil {
		return err
	}
	for _, kw := range keywords {
		kw = trim(kw)
		if kw == "" {
			continue
		}
		if _, err := tx.Exec(`INSERT OR IGNORE INTO news_keywords (user_id, keyword) VALUES (?, ?)`, userID, kw); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// GetKeywords returns all keywords for a user.
func (s *Store) GetKeywords(userID int64) ([]string, error) {
	rows, err := s.db.Query(`SELECT keyword FROM news_keywords WHERE user_id = ? ORDER BY id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]string, 0)
	for rows.Next() {
		var kw string
		if err := rows.Scan(&kw); err != nil {
			return nil, err
		}
		out = append(out, kw)
	}
	return out, rows.Err()
}

// GetAllSubscriptions returns every (user_id, keyword) pair, used by RSS feed generation.
func (s *Store) GetAllSubscriptions() ([]struct {
	UserID  int64
	Keyword string
}, error) {
	rows, err := s.db.Query(`SELECT user_id, keyword FROM news_keywords ORDER BY user_id, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]struct {
		UserID  int64
		Keyword string
	}, 0)
	for rows.Next() {
		var u struct {
			UserID  int64
			Keyword string
		}
		if err := rows.Scan(&u.UserID, &u.Keyword); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

// GetOrCreateFeedToken returns the existing feed token for a user, or creates one.
func (s *Store) GetOrCreateFeedToken(userID int64) (*FeedToken, error) {
	var ft FeedToken
	err := s.db.QueryRow(
		`SELECT user_id, token, created_at FROM news_feed_tokens WHERE user_id = ?`, userID,
	).Scan(&ft.UserID, &ft.Token, &ft.CreatedAt)
	if err == nil {
		return &ft, nil
	}
	if err != sql.ErrNoRows {
		return nil, err
	}
	// Create new token
	tok, err := randomToken()
	if err != nil {
		return nil, err
	}
	_, err = s.db.Exec(
		`INSERT INTO news_feed_tokens (user_id, token) VALUES (?, ?)`,
		userID, tok,
	)
	if err != nil {
		return nil, err
	}
	return &FeedToken{UserID: userID, Token: tok, CreatedAt: time.Now().UTC()}, nil
}

// GetUserByFeedToken returns the user owning the given feed token.
func (s *Store) GetUserByFeedToken(token string) (*User, error) {
	var u User
	err := s.db.QueryRow(`
		SELECT u.id, u.username, u.created_at
		FROM news_users u JOIN news_feed_tokens f ON u.id = f.user_id
		WHERE f.token = ?`, token,
	).Scan(&u.ID, &u.Username, &u.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return &u, err
}

// ResetFeedToken generates a new feed token for the user, invalidating the old one.
func (s *Store) ResetFeedToken(userID int64) (*FeedToken, error) {
	tok, err := randomToken()
	if err != nil {
		return nil, err
	}
	_, err = s.db.Exec(
		`INSERT INTO news_feed_tokens (user_id, token, created_at) VALUES (?, ?, datetime('now'))
		 ON CONFLICT(user_id) DO UPDATE SET token = excluded.token, created_at = excluded.created_at`,
		userID, tok,
	)
	if err != nil {
		return nil, err
	}
	return &FeedToken{UserID: userID, Token: tok, CreatedAt: time.Now().UTC()}, nil
}

// PutDigest stores or replaces a daily digest.
func (s *Store) PutDigest(date, content string) error {
	_, err := s.db.Exec(`
		INSERT INTO news_digests (date, content, generated_at) VALUES (?, ?, datetime('now'))
		ON CONFLICT(date) DO UPDATE SET content = excluded.content, generated_at = excluded.generated_at`,
		date, content,
	)
	return err
}

// GetDigest returns the digest for a specific date.
func (s *Store) GetDigest(date string) (*Digest, error) {
	var d Digest
	err := s.db.QueryRow(
		`SELECT id, date, content, generated_at FROM news_digests WHERE date = ?`, date,
	).Scan(&d.ID, &d.Date, &d.Content, &d.GeneratedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return &d, err
}

// HasDigest returns true if a digest for the given date already exists.
func (s *Store) HasDigest(date string) (bool, error) {
	var n int
	err := s.db.QueryRow(`SELECT COUNT(*) FROM news_digests WHERE date = ?`, date).Scan(&n)
	return n > 0, err
}

func randomToken() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func isUniqueErr(err error) bool {
	// sqlite unique constraint
	return err != nil && (err.Error() == "UNIQUE constraint failed" ||
		len(err.Error()) > 0 && contains(err.Error(), "UNIQUE constraint"))
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && searchStr(s, sub)
}

func searchStr(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}

func trim(s string) string {
	// minimal whitespace trim
	for len(s) > 0 && (s[0] == ' ' || s[0] == '\t' || s[0] == '\n' || s[0] == '\r') {
		s = s[1:]
	}
	for len(s) > 0 && (s[len(s)-1] == ' ' || s[len(s)-1] == '\t' || s[len(s)-1] == '\n' || s[len(s)-1] == '\r') {
		s = s[:len(s)-1]
	}
	return s
}
