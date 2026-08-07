package news

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

const prefUpdateMarker = "---PREFERENCE_UPDATE---"

const maxHistoryMessages = 20 // keep last N messages for context window management

// PreferenceChatService handles conversational preference management via LLM.
type PreferenceChatService struct {
	store *Store
	llm   LLMProvider
}

// NewPreferenceChatService creates a PreferenceChatService.
func NewPreferenceChatService(store *Store, llm LLMProvider) *PreferenceChatService {
	return &PreferenceChatService{store: store, llm: llm}
}

// ChatRequest is the input for a chat interaction.
type ChatRequest struct {
	UserID         int64
	Keyword        string // empty = global conversation
	Message        string
	ConversationID int64 // 0 = auto-create
}

// ChatResponse is the output of a chat interaction.
type ChatResponse struct {
	ConversationID     int64          `json:"conversationId"`
	AssistantMessage   string         `json:"assistantMessage"`
	UpdatedPreferences *PreferenceDoc `json:"updatedPreferences,omitempty"`
	PreferenceKeyword  string         `json:"preferenceKeyword"`
}

// HandleMessage processes a user message, calls LLM, and updates preferences.
func (svc *PreferenceChatService) HandleMessage(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	// 1. Get or create conversation
	conv, err := svc.getOrCreateConversation(req.UserID, req.ConversationID, req.Keyword)
	if err != nil {
		return nil, fmt.Errorf("get conversation: %w", err)
	}

	// 2. Save user message
	if _, err := svc.store.AddMessage(conv.ID, "user", req.Message); err != nil {
		return nil, fmt.Errorf("save user message: %w", err)
	}

	// 3. Load conversation history (last N messages)
	messages, err := svc.store.GetMessages(conv.ID)
	if err != nil {
		return nil, fmt.Errorf("load messages: %w", err)
	}

	// 4. Load current preference doc
	pref, err := svc.store.GetPreference(req.UserID, req.Keyword)
	if err != nil && err != ErrNotFound {
		return nil, fmt.Errorf("load preference: %w", err)
	}
	var currentPrefDoc PreferenceDoc
	if pref != nil {
		_ = json.Unmarshal([]byte(pref.PreferenceDoc), &currentPrefDoc)
	}

	// 5. Load user's keywords for context
	keywords, _ := svc.store.GetKeywords(req.UserID)

	// 6. Build LLM messages
	llmMessages := svc.buildLLMMessages(conv, messages, keywords, currentPrefDoc, req.Keyword)

	// 7. Call LLM
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()
	content, _, err := svc.llm.Chat(ctx, llmMessages)
	if err != nil {
		// Save error message as assistant response so user sees something
		errMsg := "抱歉，处理时出现了问题，请稍后重试。"
		_, _ = svc.store.AddMessage(conv.ID, "assistant", errMsg)
		return &ChatResponse{
			ConversationID:    conv.ID,
			AssistantMessage:  errMsg,
			PreferenceKeyword: req.Keyword,
		}, nil
	}

	// 8. Parse response: extract conversation reply + preference update
	reply, prefUpdate := parsePrefResponse(content)

	// 9. Save assistant message
	if _, err := svc.store.AddMessage(conv.ID, "assistant", reply); err != nil {
		return nil, fmt.Errorf("save assistant message: %w", err)
	}

	// 10. Apply preference update if present
	var updatedDoc *PreferenceDoc
	if prefUpdate != nil {
		updatedDoc = svc.mergePreference(currentPrefDoc, prefUpdate)
		docBytes, _ := json.Marshal(updatedDoc)
		if err := svc.store.SetPreference(req.UserID, req.Keyword, string(docBytes)); err != nil {
			return nil, fmt.Errorf("save preference: %w", err)
		}
	}

	// 11. Process any unprocessed feedback as additional context
	go svc.processFeedback(req.UserID, req.Keyword)

	return &ChatResponse{
		ConversationID:     conv.ID,
		AssistantMessage:   reply,
		UpdatedPreferences: updatedDoc,
		PreferenceKeyword:  req.Keyword,
	}, nil
}

func (svc *PreferenceChatService) getOrCreateConversation(userID, convID int64, keyword string) (*Conversation, error) {
	if convID > 0 {
		return svc.store.GetConversation(userID, convID)
	}
	return svc.store.GetOrCreateConversation(userID, keyword)
}

func (svc *PreferenceChatService) buildLLMMessages(conv *Conversation, history []ConversationMessage, keywords []string, currentPref PreferenceDoc, keyword string) []ChatMessage {
	// Build system prompt
	scope := "全局偏好"
	if keyword != "" {
		scope = fmt.Sprintf("关键词\"%s\"的偏好", keyword)
	}

	prefJSON, _ := json.Marshal(currentPref)

	systemContent := fmt.Sprintf(`你是用户的新闻订阅偏好助手。帮助用户管理他们对各话题的信息收集偏好。

当前上下文：
- 用户关键词：%s
- 当前对话范围：%s
- 现有偏好：%s

你的任务：
1. 以简洁自然的中文回应，控制在2-3句话以内
2. 理解用户表达的偏好（关注角度、感兴趣/不感兴趣的内容类型等）
3. 当偏好需要更新时，在回复末尾输出偏好更新，格式如下：

%s
{"add_interests": [...], "remove_interests": [...], "add_dislikes": [...], "remove_dislikes": [...], "set_angles": [...], "notes": "..."}

字段说明：
- add_interests/remove_interests：添加/移除感兴趣的内容类型
- add_dislikes/remove_dislikes：添加/移除不感兴趣的内容类型
- set_angles：直接设置偏好角度（替换原有）
- notes：直接设置备注（替换原有）

仅输出需要变更的字段。如果偏好无需更新，不输出 %s 部分。

示例：
用户：我对AI安全研究更感兴趣，不太想看纯产品发布
助手：明白了！我会记住你更关注AI安全研究，对纯产品发布类内容会减少推荐。
%s
{"add_interests": ["AI安全研究"], "add_dislikes": ["纯产品发布"]}

请用中文回答。`,
		strings.Join(keywords, ", "),
		scope,
		string(prefJSON),
		prefUpdateMarker,
		prefUpdateMarker,
		prefUpdateMarker,
	)

	msgs := []ChatMessage{
		{Role: "system", Content: systemContent},
	}

	// Add recent history (skip the last user message since we'll add it separately)
	var historyMsgs []ConversationMessage
	if len(history) > maxHistoryMessages {
		historyMsgs = history[len(history)-maxHistoryMessages:]
	} else {
		historyMsgs = history
	}

	// The last message in history is the user's current message (we saved it in step 2)
	// Include all history including the latest user message
	for _, m := range historyMsgs {
		msgs = append(msgs, ChatMessage{Role: m.Role, Content: m.Content})
	}

	return msgs
}

// preferenceUpdate represents the incremental update from LLM.
type preferenceUpdate struct {
	AddInterests    []string `json:"add_interests"`
	RemoveInterests []string `json:"remove_interests"`
	AddDislikes     []string `json:"add_dislikes"`
	RemoveDislikes  []string `json:"remove_dislikes"`
	SetAngles       []string `json:"set_angles"`
	Notes           string   `json:"notes"`
}

// parsePrefResponse splits the LLM response into conversation reply and preference update JSON.
func parsePrefResponse(raw string) (string, *preferenceUpdate) {
	idx := strings.Index(raw, prefUpdateMarker)
	if idx < 0 {
		return strings.TrimSpace(raw), nil
	}
	reply := strings.TrimSpace(raw[:idx])
	jsonPart := strings.TrimSpace(raw[idx+len(prefUpdateMarker):])

	// Extract JSON object (handle potential markdown code fences)
	jsonPart = extractJSON(jsonPart)
	if jsonPart == "" {
		return reply, nil
	}

	var update preferenceUpdate
	if err := json.Unmarshal([]byte(jsonPart), &update); err != nil {
		// Failed to parse, just return the reply
		return reply, nil
	}
	return reply, &update
}

// extractJSON tries to find a JSON object in the text, handling markdown code fences.
func extractJSON(s string) string {
	s = strings.TrimSpace(s)
	// Remove markdown code fences if present
	if strings.HasPrefix(s, "```") {
		// Remove first line (```json or ```)
		if nl := strings.Index(s, "\n"); nl >= 0 {
			s = s[nl+1:]
		}
		s = strings.TrimSuffix(s, "```")
		s = strings.TrimSpace(s)
	}

	// Find the first { and last }
	start := strings.Index(s, "{")
	if start < 0 {
		return ""
	}
	end := strings.LastIndex(s, "}")
	if end < 0 || end <= start {
		return ""
	}
	return s[start : end+1]
}

// mergePreference applies the incremental update to the current preference document.
func (svc *PreferenceChatService) mergePreference(current PreferenceDoc, update *preferenceUpdate) *PreferenceDoc {
	result := PreferenceDoc{
		Interests:       make([]string, len(current.Interests)),
		Dislikes:        make([]string, len(current.Dislikes)),
		PreferredAngles: make([]string, len(current.PreferredAngles)),
		Notes:           current.Notes,
	}
	copy(result.Interests, current.Interests)
	copy(result.Dislikes, current.Dislikes)
	copy(result.PreferredAngles, current.PreferredAngles)

	// Add interests (dedup)
	for _, item := range update.AddInterests {
		if !containsStr(result.Interests, item) {
			result.Interests = append(result.Interests, item)
		}
	}
	// Remove interests
	for _, item := range update.RemoveInterests {
		result.Interests = removeStr(result.Interests, item)
	}
	// Add dislikes
	for _, item := range update.AddDislikes {
		if !containsStr(result.Dislikes, item) {
			result.Dislikes = append(result.Dislikes, item)
		}
	}
	// Remove dislikes
	for _, item := range update.RemoveDislikes {
		result.Dislikes = removeStr(result.Dislikes, item)
	}
	// Set angles (replace)
	if update.SetAngles != nil {
		result.PreferredAngles = update.SetAngles
	}
	// Set notes (replace)
	if update.Notes != "" {
		result.Notes = update.Notes
	}
	return &result
}

// processFeedback processes unprocessed feedback entries for a user+keyword.
func (svc *PreferenceChatService) processFeedback(userID int64, keyword string) {
	feedbacks, err := svc.store.GetUnprocessedFeedback(userID)
	if err != nil || len(feedbacks) == 0 {
		return
	}

	// Group feedback by keyword
	byKeyword := make(map[string][]Feedback)
	for _, f := range feedbacks {
		byKeyword[f.Keyword] = append(byKeyword[f.Keyword], f)
	}

	var allIDs []int64
	for kw, items := range byKeyword {
		// Only process for the keyword that matches the current conversation,
		// or process all if this is a global conversation
		if keyword != "" && kw != keyword {
			continue
		}
		if err := svc.processFeedbackGroup(userID, kw, items); err != nil {
			// Log but don't fail
			continue
		}
		for _, f := range items {
			allIDs = append(allIDs, f.ID)
		}
	}

	if len(allIDs) > 0 {
		_ = svc.store.MarkFeedbackProcessed(allIDs)
	}
}

// processFeedbackGroup sends a batch of feedback to LLM and updates preferences.
func (svc *PreferenceChatService) processFeedbackGroup(userID int64, keyword string, feedbacks []Feedback) error {
	// Build summary of feedback
	var moreLike, notInterested []string
	for _, f := range feedbacks {
		if f.FeedbackType == "more_like_this" {
			moreLike = append(moreLike, f.NewsItemTitle)
		} else {
			notInterested = append(notInterested, f.NewsItemTitle)
		}
	}

	var sb strings.Builder
	sb.WriteString("用户最近对以下新闻给出了反馈：\n")
	if len(moreLike) > 0 {
		sb.WriteString("标记为\"更多此类\"的新闻：\n")
		for _, t := range moreLike {
			sb.WriteString("- " + t + "\n")
		}
	}
	if len(notInterested) > 0 {
		sb.WriteString("标记为\"不感兴趣\"的新闻：\n")
		for _, t := range notInterested {
			sb.WriteString("- " + t + "\n")
		}
	}
	sb.WriteString(fmt.Sprintf("\n请根据这些反馈，总结用户对关键词\"%s\"的偏好更新。", keyword))

	// Load current preference
	pref, _ := svc.store.GetPreference(userID, keyword)
	var currentPref PreferenceDoc
	if pref != nil {
		_ = json.Unmarshal([]byte(pref.PreferenceDoc), &currentPref)
	}
	prefJSON, _ := json.Marshal(currentPref)

	systemContent := fmt.Sprintf(`你是一位偏好分析助手。根据用户对新闻的反馈，提取偏好更新。

当前偏好：%s

请分析用户反馈，输出偏好更新。格式：

%s
{"add_interests": [...], "add_dislikes": [...]}

仅输出需要变更的字段。请用中文回答。`,
		string(prefJSON), prefUpdateMarker)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	content, _, err := svc.llm.Chat(ctx, []ChatMessage{
		{Role: "system", Content: systemContent},
		{Role: "user", Content: sb.String()},
	})
	if err != nil {
		return err
	}

	_, update := parsePrefResponse(content)
	if update == nil {
		return nil
	}

	updatedDoc := svc.mergePreference(currentPref, update)
	docBytes, _ := json.Marshal(updatedDoc)
	return svc.store.SetPreference(userID, keyword, string(docBytes))
}

// --- Preference scoring for news matching ---

// ScoreNewsItem calculates a relevance score for a news item based on user preferences.
func ScoreNewsItem(title string, prefs []PreferenceDoc) (int, []string) {
	score := 0
	var matchedInterests []string
	titleLower := strings.ToLower(title)

	for _, p := range prefs {
		for _, interest := range p.Interests {
			if interest == "" {
				continue
			}
			if strings.Contains(titleLower, strings.ToLower(interest)) {
				score += 2
				matchedInterests = append(matchedInterests, interest)
			}
		}
		for _, dislike := range p.Dislikes {
			if dislike == "" {
				continue
			}
			if strings.Contains(titleLower, strings.ToLower(dislike)) {
				score -= 3
			}
		}
	}
	return score, matchedInterests
}

// containsStr checks if a string is in a slice (case-insensitive).
func containsStr(slice []string, s string) bool {
	for _, item := range slice {
		if strings.EqualFold(item, s) {
			return true
		}
	}
	return false
}

// removeStr removes all occurrences of s from slice (case-insensitive).
func removeStr(slice []string, s string) []string {
	out := make([]string, 0, len(slice))
	for _, item := range slice {
		if !strings.EqualFold(item, s) {
			out = append(out, item)
		}
	}
	return out
}
