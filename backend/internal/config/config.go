package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port              string
	CORSOrigins       []string
	LLMBaseURL        string
	LLMAPIKey         string
	LLMModel          string
	RequestTimeoutSec int
	MaxBodyBytes      int64
	KnowledgeRoot     string
}

func Load() Config {
	return Config{
		Port:              getenv("PORT", "8080"),
		CORSOrigins:       splitCSV(getenv("CORS_ORIGINS", "http://localhost:5173,https://foreverart.github.io")),
		LLMBaseURL:        strings.TrimRight(getenv("LLM_BASE_URL", "https://api.openai.com/v1"), "/"),
		LLMAPIKey:         os.Getenv("LLM_API_KEY"),
		LLMModel:          getenv("LLM_MODEL", "gpt-4o-mini"),
		RequestTimeoutSec: getenvInt("REQUEST_TIMEOUT_SEC", 60),
		MaxBodyBytes:      int64(getenvInt("MAX_BODY_BYTES", 5*1024*1024)),
		KnowledgeRoot:     getenv("KNOWLEDGE_ROOT", ""),
	}
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func getenvInt(k string, def int) int {
	if v := os.Getenv(k); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
