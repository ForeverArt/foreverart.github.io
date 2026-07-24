package report

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/foreverart/foreverart.github.io/backend/internal/knowledge"
	"github.com/foreverart/foreverart.github.io/backend/internal/llm"
)

type SpinReportRequest struct {
	SchemaVersion string `json:"schemaVersion"`
	Report        struct {
		SchemaVersion string `json:"schemaVersion"`
		Skill         string `json:"skill"`
		Summary       struct {
			OverallScore int      `json:"overallScore"`
			OverallGrade string   `json:"overallGrade"`
			DurationSec  float64  `json:"durationSec"`
			Warnings     []string `json:"warnings"`
		} `json:"summary"`
		Features map[string]any `json:"features"`
		Rules    map[string]any `json:"rules"`
		Events   []any          `json:"events"`
		Traceability struct {
			KnowledgeRefs []string `json:"knowledgeRefs"`
			RuleRefs      []string `json:"ruleRefs"`
			FeatureIDs    []string `json:"featureIds"`
		} `json:"traceability"`
	} `json:"report"`
	Meta struct {
		SpinID        string `json:"spinId"`
		Athlete       string `json:"athlete"`
		Skill         string `json:"skill"`
		Source        string `json:"source"`
		VideoFileName string `json:"videoFileName"`
	} `json:"meta"`
}

type SpinReportResponse struct {
	ReportID      string   `json:"reportId"`
	SchemaVersion string   `json:"schemaVersion"`
	Markdown      string   `json:"markdown"`
	Model         string   `json:"model"`
	GeneratedAt   string   `json:"generatedAt"`
	KnowledgeRefs []string `json:"knowledgeRefs"`
}

type Service struct {
	Curator  *knowledge.Curator
	Provider llm.Provider
}

func (s *Service) Generate(ctx context.Context, req SpinReportRequest) (*SpinReportResponse, error) {
	if req.SchemaVersion == "" || req.Report.SchemaVersion == "" {
		return nil, fmt.Errorf("schemaVersion required")
	}
	if req.Report.Skill != "upright_spin" && req.Meta.Skill != "upright_spin" {
		// allow either field
	}
	refs := append([]string{}, req.Report.Traceability.KnowledgeRefs...)
	refs = append(refs, req.Report.Traceability.RuleRefs...)
	excerpts, used, err := s.Curator.Load(refs)
	if err != nil {
		return nil, err
	}

	reportJSON, _ := json.MarshalIndent(req.Report, "", "  ")
	var kb strings.Builder
	for ref, text := range excerpts {
		kb.WriteString("### ")
		kb.WriteString(ref)
		kb.WriteString("\n")
		kb.WriteString(text)
		kb.WriteString("\n\n")
	}

	system := `你是一名花滑技术教练助手。只能依据提供的 Knowledge excerpts 与 deterministic Report JSON 进行分析。
约束：
1. 不重新计算任何数值，不修改分数或 grade。
2. 不臆测 ISU Level / GOE。
3. Center Drift / COM Offset 是身体尺度 proxy，不得写成真实厘米或真实人体 COM。
4. 输出必须使用以下 Markdown 章节标题（按顺序）：
## 总体评价
## 优点
## 不足
## 原因分析
## 训练建议
5. 尽量引用 Report 中的具体数值与 knowledge 路径。`

	user := llm.ChatMessage{Role: "user", Content: "Report JSON:\n```json\n" + string(reportJSON) + "\n```\n\nKnowledge excerpts:\n" + kb.String()}
	content, model, err := s.Provider.Chat(ctx, []llm.ChatMessage{
		{Role: "system", Content: system},
		user,
	})
	if err != nil {
		return nil, err
	}
	if !strings.Contains(content, "## 总体评价") {
		return nil, fmt.Errorf("llm output missing required section headers")
	}

	return &SpinReportResponse{
		ReportID:      fmt.Sprintf("rpt-%d", time.Now().UnixNano()),
		SchemaVersion: req.SchemaVersion,
		Markdown:      content,
		Model:         model,
		GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
		KnowledgeRefs: used,
	}, nil
}
