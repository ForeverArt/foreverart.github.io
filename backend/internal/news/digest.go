package news

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

// LLMProvider is the interface for generating AI summaries (reuses existing llm.Provider).
type LLMProvider interface {
	Chat(ctx context.Context, messages []ChatMessage) (content string, model string, err error)
}

// ChatMessage is a minimal type for LLM chat requests.
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// DigestService manages AI daily digest generation and caching.
type DigestService struct {
	store    *Store
	tr       *TrendRadarReader
	llm      LLMProvider
	mu       sync.Mutex
	lastRun  time.Time
}

// NewDigestService creates a DigestService and starts the scheduler goroutine.
func NewDigestService(store *Store, tr *TrendRadarReader, llm LLMProvider) *DigestService {
	ds := &DigestService{store: store, tr: tr, llm: llm}
	go ds.scheduler()
	return ds
}

// GetDigest returns the cached digest for today, or generates on-demand if requested.
func (ds *DigestService) GetDigest(w http.ResponseWriter, r *http.Request) {
	date := r.URL.Query().Get("date")
	if date == "" {
		date = todayStr()
	}
	d, err := ds.store.GetDigest(date)
	if err == nil {
		jsonResp(w, http.StatusOK, map[string]any{
			"date":         d.Date,
			"content":      d.Content,
			"generated_at": d.GeneratedAt,
		})
		return
	}
	// Not found: try to generate on-demand if it's today
	if date == todayStr() {
		ds.mu.Lock()
		defer ds.mu.Unlock()
		content, err := ds.generate()
		if err != nil {
			jsonError(w, http.StatusServiceUnavailable, "digest generation failed: "+err.Error())
			return
		}
		_ = ds.store.PutDigest(date, content)
		jsonResp(w, http.StatusOK, map[string]any{
			"date":         date,
			"content":      content,
			"generated_at": time.Now().UTC(),
		})
		return
	}
	jsonError(w, http.StatusNotFound, "no digest for this date")
}

// RefreshDigest forces regeneration of today's digest.
func (ds *DigestService) RefreshDigest(w http.ResponseWriter, r *http.Request) {
	date := todayStr()
	ds.mu.Lock()
	defer ds.mu.Unlock()
	content, err := ds.generate()
	if err != nil {
		jsonError(w, http.StatusServiceUnavailable, "digest generation failed: "+err.Error())
		return
	}
	_ = ds.store.PutDigest(date, content)
	jsonResp(w, http.StatusOK, map[string]any{
		"date":         date,
		"content":      content,
		"generated_at": time.Now().UTC(),
	})
}

// scheduler runs every 5 minutes and generates a digest if it's past 08:00 CST and none exists for today.
func (ds *DigestService) scheduler() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		now := time.Now().In(cst())
		if now.Hour() < 8 {
			continue
		}
		date := now.Format("2006-01-02")
		has, _ := ds.store.HasDigest(date)
		if has {
			continue
		}
		ds.mu.Lock()
		content, err := ds.generate()
		ds.mu.Unlock()
		if err != nil {
			log.Printf("[news] digest generation failed: %v", err)
			continue
		}
		if err := ds.store.PutDigest(date, content); err != nil {
			log.Printf("[news] digest store failed: %v", err)
			continue
		}
		log.Printf("[news] digest generated for %s", date)
	}
}

// generate calls the LLM to produce a daily digest summary.
func (ds *DigestService) generate() (string, error) {
	date := todayStr()
	items, err := ds.tr.TopHotItems(date, 30)
	if err != nil {
		return "", err
	}
	if len(items) == 0 {
		return "今日暂无热点数据。", nil
	}

	// Build a text summary of top items for the LLM
	var sb strings.Builder
	sb.WriteString("以下是今日各平台热点资讯摘要（按热度排序）：\n\n")
	for i, it := range items {
		sb.WriteString(fmt.Sprintf("%d. [%s] %s (热度: %d次抓取, 当前排名: %d)\n",
			i+1, it.PlatformName, it.Title, it.CrawlCount, it.Rank))
	}

	prompt := ChatMessage{
		Role: "user",
		Content: sb.String() + "\n请根据以上热点资讯，生成一份简洁的中文日报摘要。要求：\n" +
			"1. 总结今日主要热点趋势（2-3句话）\n" +
			"2. 按主题分组列出关键事件（科技、社会、娱乐、体育等）\n" +
			"3. 点出值得关注的趋势或现象\n" +
			"4. 语言简洁有力，避免冗余",
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	content, _, err := ds.llm.Chat(ctx, []ChatMessage{
		{Role: "system", Content: "你是一位专业的资讯分析师，擅长从热点数据中提炼洞察。请用中文回答。"},
		prompt,
	})
	if err != nil {
		return "", err
	}
	return content, nil
}
