package news

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
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
		CREATE TABLE IF NOT EXISTS news_topic_preferences (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL REFERENCES news_users(id) ON DELETE CASCADE,
			keyword TEXT NOT NULL DEFAULT '',
			preference_doc TEXT NOT NULL DEFAULT '{}',
			updated_at DATETIME NOT NULL DEFAULT (datetime('now')),
			UNIQUE(user_id, keyword)
		);
		CREATE TABLE IF NOT EXISTS news_conversations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL REFERENCES news_users(id) ON DELETE CASCADE,
			keyword TEXT NOT NULL DEFAULT '',
			created_at DATETIME NOT NULL DEFAULT (datetime('now')),
			updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
		);
		CREATE TABLE IF NOT EXISTS news_conversation_messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			conversation_id INTEGER NOT NULL REFERENCES news_conversations(id) ON DELETE CASCADE,
			role TEXT NOT NULL,
			content TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT (datetime('now'))
		);
		CREATE TABLE IF NOT EXISTS news_feedback_log (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL REFERENCES news_users(id) ON DELETE CASCADE,
			news_item_id TEXT NOT NULL,
			news_item_title TEXT NOT NULL,
			keyword TEXT NOT NULL DEFAULT '',
			feedback_type TEXT NOT NULL,
			processed INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT (datetime('now'))
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

// --- Preferences ---

// GetPreference loads a preference record for a user+keyword.
func (s *Store) GetPreference(userID int64, keyword string) (*PreferenceRecord, error) {
	var r PreferenceRecord
	err := s.db.QueryRow(
		`SELECT id, user_id, keyword, preference_doc, updated_at FROM news_topic_preferences WHERE user_id = ? AND keyword = ?`,
		userID, keyword,
	).Scan(&r.ID, &r.UserID, &r.Keyword, &r.PreferenceDoc, &r.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return &r, err
}

// SetPreference saves or updates a preference record.
func (s *Store) SetPreference(userID int64, keyword, doc string) error {
	_, err := s.db.Exec(
		`INSERT INTO news_topic_preferences (user_id, keyword, preference_doc, updated_at)
		 VALUES (?, ?, ?, datetime('now'))
		 ON CONFLICT(user_id, keyword) DO UPDATE SET preference_doc = excluded.preference_doc, updated_at = excluded.updated_at`,
		userID, keyword, doc,
	)
	return err
}

// GetAllPreferences returns global + per-keyword preferences for a user.
func (s *Store) GetAllPreferences(userID int64) (*AllPreferences, error) {
	rows, err := s.db.Query(
		`SELECT keyword, preference_doc FROM news_topic_preferences WHERE user_id = ?`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := &AllPreferences{
		Global:   PreferenceDoc{},
		Keywords: make(map[string]PreferenceDoc),
	}
	for rows.Next() {
		var keyword, doc string
		if err := rows.Scan(&keyword, &doc); err != nil {
			return nil, err
		}
		var p PreferenceDoc
		_ = json.Unmarshal([]byte(doc), &p)
		if keyword == "" {
			out.Global = p
		} else {
			out.Keywords[keyword] = p
		}
	}
	return out, rows.Err()
}

// --- Conversations ---

// GetConversation loads a conversation by user and id.
func (s *Store) GetConversation(userID, convID int64) (*Conversation, error) {
	var c Conversation
	err := s.db.QueryRow(
		`SELECT id, user_id, keyword, created_at, updated_at FROM news_conversations WHERE id = ? AND user_id = ?`,
		convID, userID,
	).Scan(&c.ID, &c.UserID, &c.Keyword, &c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return &c, err
}

// GetOrCreateConversation returns the existing conversation for user+keyword, or creates one.
func (s *Store) GetOrCreateConversation(userID int64, keyword string) (*Conversation, error) {
	var c Conversation
	err := s.db.QueryRow(
		`SELECT id, user_id, keyword, created_at, updated_at FROM news_conversations WHERE user_id = ? AND keyword = ?`,
		userID, keyword,
	).Scan(&c.ID, &c.UserID, &c.Keyword, &c.CreatedAt, &c.UpdatedAt)
	if err == nil {
		return &c, nil
	}
	if err != sql.ErrNoRows {
		return nil, err
	}
	res, err := s.db.Exec(
		`INSERT INTO news_conversations (user_id, keyword) VALUES (?, ?)`,
		userID, keyword,
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &Conversation{ID: id, UserID: userID, Keyword: keyword, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}, nil
}

// ListConversations returns all conversations for a user, optionally filtered by keyword.
func (s *Store) ListConversations(userID int64, keyword string) ([]Conversation, error) {
	var rows *sql.Rows
	var err error
	if keyword == "" {
		rows, err = s.db.Query(
			`SELECT id, user_id, keyword, created_at, updated_at FROM news_conversations WHERE user_id = ? ORDER BY updated_at DESC`,
			userID,
		)
	} else {
		rows, err = s.db.Query(
			`SELECT id, user_id, keyword, created_at, updated_at FROM news_conversations WHERE user_id = ? AND keyword = ? ORDER BY updated_at DESC`,
			userID, keyword,
		)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]Conversation, 0)
	for rows.Next() {
		var c Conversation
		if err := rows.Scan(&c.ID, &c.UserID, &c.Keyword, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// AddMessage appends a message to a conversation.
func (s *Store) AddMessage(convID int64, role, content string) (int64, error) {
	res, err := s.db.Exec(
		`INSERT INTO news_conversation_messages (conversation_id, role, content) VALUES (?, ?, ?)`,
		convID, role, content,
	)
	if err != nil {
		return 0, err
	}
	_, err = s.db.Exec(
		`UPDATE news_conversations SET updated_at = datetime('now') WHERE id = ?`,
		convID,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// GetMessages returns all messages for a conversation in chronological order.
func (s *Store) GetMessages(convID int64) ([]ConversationMessage, error) {
	rows, err := s.db.Query(
		`SELECT id, conversation_id, role, content, created_at FROM news_conversation_messages WHERE conversation_id = ? ORDER BY id ASC`,
		convID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]ConversationMessage, 0)
	for rows.Next() {
		var m ConversationMessage
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.Role, &m.Content, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// --- Feedback ---

// AddFeedback records a feedback entry.
func (s *Store) AddFeedback(userID int64, itemID, title, keyword, feedbackType string) error {
	_, err := s.db.Exec(
		`INSERT INTO news_feedback_log (user_id, news_item_id, news_item_title, keyword, feedback_type) VALUES (?, ?, ?, ?, ?)`,
		userID, itemID, title, keyword, feedbackType,
	)
	return err
}

// GetUnprocessedFeedback returns unprocessed feedback for a user.
func (s *Store) GetUnprocessedFeedback(userID int64) ([]Feedback, error) {
	rows, err := s.db.Query(
		`SELECT id, user_id, news_item_id, news_item_title, keyword, feedback_type, processed, created_at FROM news_feedback_log WHERE user_id = ? AND processed = 0 ORDER BY created_at ASC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]Feedback, 0)
	for rows.Next() {
		var f Feedback
		var processed int
		if err := rows.Scan(&f.ID, &f.UserID, &f.NewsItemID, &f.NewsItemTitle, &f.Keyword, &f.FeedbackType, &processed, &f.CreatedAt); err != nil {
			return nil, err
		}
		f.Processed = processed != 0
		out = append(out, f)
	}
	return out, rows.Err()
}

// MarkFeedbackProcessed marks feedback entries as processed.
func (s *Store) MarkFeedbackProcessed(ids []int64) error {
	if len(ids) == 0 {
		return nil
	}
	// Build placeholders
	placeholders := make([]string, len(ids))
	args := make([]any, len(ids))
	for i, id := range ids {
		placeholders[i] = "?"
		args[i] = id
	}
	_, err := s.db.Exec(
		fmt.Sprintf(`UPDATE news_feedback_log SET processed = 1 WHERE id IN (%s)`, strings.Join(placeholders, ",")),
		args...,
	)
	return err
}
