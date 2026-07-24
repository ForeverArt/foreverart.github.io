package main

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/foreverart/foreverart.github.io/backend/internal/config"
	"github.com/foreverart/foreverart.github.io/backend/internal/httpx"
	"github.com/foreverart/foreverart.github.io/backend/internal/knowledge"
	"github.com/foreverart/foreverart.github.io/backend/internal/llm"
	"github.com/foreverart/foreverart.github.io/backend/internal/report"
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

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true}`))
	})
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
		ctx, cancel := context.WithTimeout(r.Context(), time.Duration(cfg.RequestTimeoutSec)*time.Second)
		defer cancel()
		resp, err := svc.Generate(ctx, req)
		if err != nil {
			httpx.JSONError(w, http.StatusBadGateway, err.Error())
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	})

	handler := httpx.CORS(cfg.CORSOrigins)(mux)
	addr := ":" + cfg.Port
	log.Printf("spin report server listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, handler))
}
