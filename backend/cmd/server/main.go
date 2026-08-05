package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/foreverart/foreverart.github.io/backend/internal/config"
	"github.com/foreverart/foreverart.github.io/backend/internal/httpx"
	"github.com/foreverart/foreverart.github.io/backend/internal/knowledge"
	"github.com/foreverart/foreverart.github.io/backend/internal/llm"
	"github.com/foreverart/foreverart.github.io/backend/internal/news"
	"github.com/foreverart/foreverart.github.io/backend/internal/report"
	"github.com/foreverart/foreverart.github.io/backend/internal/stats"
	"github.com/foreverart/foreverart.github.io/backend/internal/version"
)

func main() {
	cfg := config.Load()
	curator, err := knowledge.NewCurator(cfg.KnowledgeRoot)
	if err != nil {
		log.Fatal(err)
	}
	provider := &llm.OpenAICompat{
		BaseURL:    cfg.LLMBaseURL,
		APIKey:     cfg.LLMAPIKey,
		Model:      cfg.LLMModel,
		HTTPClient: &http.Client{Timeout: time.Duration(cfg.RequestTimeoutSec) * time.Second},
	}
	svc := &report.Service{Curator: curator, Provider: provider}
	rec := stats.New()

	mux := http.NewServeMux()

	health := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, uptimeSec, _ := rec.Snapshot()
		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok":         true,
			"build_time": version.BuildTime,
			"uptime_sec": uptimeSec,
			"llm_model":  cfg.LLMModel,
			"llm_ready":  cfg.LLMAPIKey != "",
		})
	}
	mux.HandleFunc("/healthz", health)
	mux.HandleFunc("/api/v1/healthz", health)

	mux.HandleFunc("/api/v1/spin-reports", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			httpx.JSONError(w, http.StatusMethodNotAllowed, "POST only")
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, cfg.MaxBodyBytes)
		raw, err := io.ReadAll(r.Body)
		if err != nil {
			httpx.JSONError(w, http.StatusRequestEntityTooLarge, "body too large or unreadable")
			return
		}
		var req report.SpinReportRequest
		if err := json.Unmarshal(raw, &req); err != nil {
			httpx.JSONError(w, http.StatusBadRequest, "invalid json")
			return
		}
		start := time.Now()
		ctx, cancel := context.WithTimeout(r.Context(), time.Duration(cfg.RequestTimeoutSec)*time.Second)
		defer cancel()
		resp, err := svc.Generate(ctx, req)

		record := stats.ReportRecord{LatencyMS: time.Since(start).Milliseconds(), At: time.Now().UTC()}
		if err != nil {
			record.Status = "error"
			rec.Add(record)
			httpx.JSONError(w, http.StatusBadGateway, err.Error())
			return
		}
		record.ReportID = resp.ReportID
		record.Model = resp.Model
		record.Status = "success"
		rec.Add(record)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	})

	mux.HandleFunc("/api/v1/admin/stats", httpx.AdminAuth(cfg.AdminPassword, func(w http.ResponseWriter, r *http.Request) {
		total, uptimeSec, recent := rec.Snapshot()
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"build_time":     version.BuildTime,
			"uptime_sec":     uptimeSec,
			"requests_total": total,
			"llm_model":      cfg.LLMModel,
			"llm_base_url":   cfg.LLMBaseURL,
			"llm_ready":      cfg.LLMAPIKey != "",
			"recent_reports": recent,
		})
	}))

	// News module (optional: only enabled if NEWS_DATA_ROOT is set)
	var newsStore *news.Store
	if cfg.NewsDataRoot != "" {
		tr, err := news.NewTrendRadarReader(cfg.NewsDataRoot)
		if err != nil {
			log.Printf("[news] TrendRadar reader init failed: %v (news module disabled)", err)
		} else {
			store, err := news.OpenStore(cfg.NewsDBPath)
			if err != nil {
				log.Printf("[news] store init failed: %v (news module disabled)", err)
			} else {
				newsStore = store
				llmAdapter := &newsLLMAdapter{p: provider}
				handlers := news.NewHandlers(store, tr, llmAdapter, cfg.NewsTokenSecret)
				handlers.Register(mux)
				log.Printf("[news] module enabled: data_root=%s db=%s", cfg.NewsDataRoot, cfg.NewsDBPath)
			}
		}
	} else {
		log.Printf("[news] NEWS_DATA_ROOT not set, news module disabled")
	}

	handler := recMiddleware(rec, httpx.CORS(cfg.CORSOrigins)(mux))

	addr := cfg.Host + ":" + cfg.Port
	srv := &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      time.Duration(cfg.RequestTimeoutSec+30) * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Printf("spin report server listening on %s (build %s)", addr, version.BuildTime)
		errCh <- srv.ListenAndServe()
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-sigCh:
		log.Printf("received %s, shutting down", sig)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := srv.Shutdown(ctx); err != nil {
			log.Fatalf("graceful shutdown: %v", err)
		}
	case err := <-errCh:
		if !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	}

	if newsStore != nil {
		newsStore.Close()
	}
}

// newsLLMAdapter adapts llm.Provider to news.LLMProvider interface.
type newsLLMAdapter struct {
	p llm.Provider
}

func (a *newsLLMAdapter) Chat(ctx context.Context, messages []news.ChatMessage) (string, string, error) {
	// Convert news.ChatMessage to llm.ChatMessage
	llmMsgs := make([]llm.ChatMessage, len(messages))
	for i, m := range messages {
		llmMsgs[i] = llm.ChatMessage{Role: m.Role, Content: m.Content}
	}
	return a.p.Chat(ctx, llmMsgs)
}

// recMiddleware counts every incoming request.
func recMiddleware(rec *stats.Recorder, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rec.Inc()
		next.ServeHTTP(w, r)
	})
}
