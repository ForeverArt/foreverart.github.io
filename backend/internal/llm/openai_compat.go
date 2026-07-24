package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type OpenAICompat struct {
	BaseURL    string
	APIKey     string
	Model      string
	HTTPClient *http.Client
}

type chatRequest struct {
	Model       string        `json:"model"`
	Messages    []ChatMessage `json:"messages"`
	Temperature float64       `json:"temperature"`
}

type chatResponse struct {
	Model   string `json:"model"`
	Choices []struct {
		Message ChatMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

func (p *OpenAICompat) Chat(ctx context.Context, messages []ChatMessage) (string, string, error) {
	if p.APIKey == "" {
		return "", "", fmt.Errorf("LLM_API_KEY is empty")
	}
	client := p.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 60 * time.Second}
	}
	body, _ := json.Marshal(chatRequest{
		Model:       p.Model,
		Messages:    messages,
		Temperature: 0.2,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.BaseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.APIKey)

	res, err := client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	var parsed chatResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", "", fmt.Errorf("llm decode: %w; body=%s", err, string(raw))
	}
	if parsed.Error != nil {
		return "", "", fmt.Errorf("llm upstream: %s", parsed.Error.Message)
	}
	if res.StatusCode >= 300 {
		return "", "", fmt.Errorf("llm status %d: %s", res.StatusCode, string(raw))
	}
	if len(parsed.Choices) == 0 {
		return "", "", fmt.Errorf("llm empty choices")
	}
	model := parsed.Model
	if model == "" {
		model = p.Model
	}
	return parsed.Choices[0].Message.Content, model, nil
}

// MockProvider returns fixed markdown for tests.
type MockProvider struct {
	Content string
	Model   string
}

func (m *MockProvider) Chat(ctx context.Context, messages []ChatMessage) (string, string, error) {
	_ = ctx
	_ = messages
	return m.Content, m.Model, nil
}
