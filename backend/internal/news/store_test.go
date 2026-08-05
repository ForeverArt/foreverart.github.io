package news

import (
	"os"
	"path/filepath"
	"testing"
)

func TestStoreCreateUser(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "test.db")
	store, err := OpenStore(dbPath)
	if err != nil {
		t.Fatalf("OpenStore: %v", err)
	}
	defer store.Close()

	u, err := store.CreateUser("alice", "$2a$10$dummyhash")
	if err != nil {
		t.Fatalf("CreateUser: %v", err)
	}
	if u.Username != "alice" {
		t.Errorf("Username = %q, want alice", u.Username)
	}

	// Duplicate username
	_, err = store.CreateUser("alice", "$2a$10$dummyhash2")
	if err != ErrUserExists {
		t.Errorf("duplicate CreateUser: got %v, want ErrUserExists", err)
	}
}

func TestStoreGetUserByName(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "test.db")
	store, err := OpenStore(dbPath)
	if err != nil {
		t.Fatalf("OpenStore: %v", err)
	}
	defer store.Close()

	store.CreateUser("bob", "$2a$10$hash")

	u, pwHash, err := store.GetUserByName("BOB") // case-insensitive
	if err != nil {
		t.Fatalf("GetUserByName: %v", err)
	}
	if u.Username != "bob" {
		t.Errorf("Username = %q, want bob", u.Username)
	}
	if pwHash != "$2a$10$hash" {
		t.Errorf("pwHash = %q, want $2a$10$hash", pwHash)
	}

	_, _, err = store.GetUserByName("nonexistent")
	if err != ErrInvalidCred {
		t.Errorf("nonexistent user: got %v, want ErrInvalidCred", err)
	}
}

func TestStoreKeywords(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "test.db")
	store, err := OpenStore(dbPath)
	if err != nil {
		t.Fatalf("OpenStore: %v", err)
	}
	defer store.Close()

	u, _ := store.CreateUser("user1", "hash")

	// Set keywords
	kws := []string{"AI", "科技", "news"}
	if err := store.SetKeywords(u.ID, kws); err != nil {
		t.Fatalf("SetKeywords: %v", err)
	}

	got, err := store.GetKeywords(u.ID)
	if err != nil {
		t.Fatalf("GetKeywords: %v", err)
	}
	if len(got) != 3 {
		t.Errorf("GetKeywords len = %d, want 3", len(got))
	}

	// Replace keywords
	if err := store.SetKeywords(u.ID, []string{"only-one"}); err != nil {
		t.Fatalf("SetKeywords replace: %v", err)
	}
	got, _ = store.GetKeywords(u.ID)
	if len(got) != 1 || got[0] != "only-one" {
		t.Errorf("after replace: got %v, want [only-one]", got)
	}
}

func TestStoreFeedToken(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "test.db")
	store, err := OpenStore(dbPath)
	if err != nil {
		t.Fatalf("OpenStore: %v", err)
	}
	defer store.Close()

	u, _ := store.CreateUser("feeduser", "hash")

	// Create token
	ft, err := store.GetOrCreateFeedToken(u.ID)
	if err != nil {
		t.Fatalf("GetOrCreateFeedToken: %v", err)
	}
	if ft.Token == "" {
		t.Error("Token is empty")
	}

	// Get same token again
	ft2, err := store.GetOrCreateFeedToken(u.ID)
	if err != nil {
		t.Fatalf("GetOrCreateFeedToken 2: %v", err)
	}
	if ft2.Token != ft.Token {
		t.Error("Token should be the same")
	}

	// Reset token
	ft3, err := store.ResetFeedToken(u.ID)
	if err != nil {
		t.Fatalf("ResetFeedToken: %v", err)
	}
	if ft3.Token == ft.Token {
		t.Error("Reset token should be different")
	}

	// Lookup by token
	u2, err := store.GetUserByFeedToken(ft3.Token)
	if err != nil {
		t.Fatalf("GetUserByFeedToken: %v", err)
	}
	if u2.ID != u.ID {
		t.Errorf("User ID = %d, want %d", u2.ID, u.ID)
	}
}

func TestStoreDigest(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "test.db")
	store, err := OpenStore(dbPath)
	if err != nil {
		t.Fatalf("OpenStore: %v", err)
	}
	defer store.Close()

	has, _ := store.HasDigest("2025-08-04")
	if has {
		t.Error("HasDigest should be false initially")
	}

	if err := store.PutDigest("2025-08-04", "今日热点总结..."); err != nil {
		t.Fatalf("PutDigest: %v", err)
	}

	has, _ = store.HasDigest("2025-08-04")
	if !has {
		t.Error("HasDigest should be true after Put")
	}

	d, err := store.GetDigest("2025-08-04")
	if err != nil {
		t.Fatalf("GetDigest: %v", err)
	}
	if d.Content != "今日热点总结..." {
		t.Errorf("Content = %q", d.Content)
	}

	// Update digest
	store.PutDigest("2025-08-04", "更新后的总结")
	d, _ = store.GetDigest("2025-08-04")
	if d.Content != "更新后的总结" {
		t.Errorf("updated Content = %q", d.Content)
	}
}

func TestTrendRadarReaderListDates(t *testing.T) {
	dir := t.TempDir()
	// Create a fake news directory with a db file
	newsDir := filepath.Join(dir, "news")
	os.MkdirAll(newsDir, 0755)
	os.WriteFile(filepath.Join(newsDir, "2025-08-01.db"), []byte{}, 0644)
	os.WriteFile(filepath.Join(newsDir, "2025-08-02.db"), []byte{}, 0644)

	tr, err := NewTrendRadarReader(dir)
	if err != nil {
		t.Fatalf("NewTrendRadarReader: %v", err)
	}

	dates, err := tr.ListDates()
	if err != nil {
		t.Fatalf("ListDates: %v", err)
	}
	if len(dates) != 2 {
		t.Errorf("ListDates len = %d, want 2", len(dates))
	}
	// Should be sorted descending
	if dates[0].Date != "2025-08-02" {
		t.Errorf("dates[0] = %s, want 2025-08-02", dates[0].Date)
	}
}
