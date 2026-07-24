package report

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/foreverart/foreverart.github.io/backend/internal/httpx"
	"github.com/foreverart/foreverart.github.io/backend/internal/knowledge"
	"github.com/foreverart/foreverart.github.io/backend/internal/llm"
)

func TestGenerateWithMockLLM(t *testing.T) {
	curator, err := knowledge.NewCurator("")
	if err != nil {
		t.Fatal(err)
	}
	svc := &Service{
		Curator: curator,
		Provider: &llm.MockProvider{
			Content: "## 总体评价\nok\n\n## 优点\na\n\n## 不足\nb\n\n## 原因分析\nc\n\n## 训练建议\nd\n",
			Model:   "mock",
		},
	}
	req := SpinReportRequest{SchemaVersion: "2.0.0"}
	req.Report.SchemaVersion = "2.0.0"
	req.Report.Skill = "upright_spin"
	req.Report.Summary.OverallScore = 88
	req.Report.Summary.OverallGrade = "good"
	req.Report.Traceability.KnowledgeRefs = []string{"knowledge/features/spin/axis.md"}
	req.Report.Traceability.RuleRefs = []string{"knowledge/rules/spin/axis.md"}
	req.Meta.Skill = "upright_spin"

	resp, err := svc.Generate(context.Background(), req)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(resp.Markdown, "## 总体评价") {
		t.Fatalf("unexpected markdown: %s", resp.Markdown)
	}
	if len(resp.KnowledgeRefs) == 0 {
		t.Fatal("expected knowledge refs")
	}
}

func TestCORSAllowsConfiguredOrigin(t *testing.T) {
	h := httpx.CORS([]string{"http://localhost:5173"})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	req := httptest.NewRequest(http.MethodOptions, "/api/v1/spin-reports", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("status=%d", rr.Code)
	}
	if rr.Header().Get("Access-Control-Allow-Origin") != "http://localhost:5173" {
		t.Fatalf("cors origin missing")
	}
}
