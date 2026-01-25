package services

import (
	"bytes"
	"content-engine/internal/config"
	"content-engine/internal/repository"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

type AIService struct {
	cfg         *config.Config
	settingRepo *repository.SettingRepository
}

func NewAIService(cfg *config.Config, settingRepo *repository.SettingRepository) *AIService {
	return &AIService{
		cfg:         cfg,
		settingRepo: settingRepo,
	}
}

// ProcessResult AI 处理结果
type ProcessResult struct {
	ContentZh string `json:"content_zh"`
	ContentEn string `json:"content_en"`
}

// SearchResult 搜索结果
type SearchResult struct {
	Items []SearchItem `json:"items"`
}

type SearchItem struct {
	Author     string `json:"author"`
	Content    string `json:"content"`
	URL        string `json:"url"`
	Revenue    string `json:"revenue"`
	Engagement string `json:"engagement"`
}

// Process 处理内容，生成中英文版本
func (s *AIService) Process(rawContent string, generateZh, generateEn bool) (*ProcessResult, error) {
	result := &ProcessResult{}

	// 获取配置
	model := s.settingRepo.GetValue("ai_model")
	if model == "" {
		model = s.cfg.POEModel
	}

	// 生成中文版本
	if generateZh {
		promptTemplate := s.settingRepo.GetValue("prompt_rewrite_zh")
		prompt := strings.Replace(promptTemplate, "{{content}}", rawContent, -1)

		content, err := s.callPOE(prompt, model, false)
		if err != nil {
			return nil, fmt.Errorf("generate zh failed: %w", err)
		}
		result.ContentZh = content
	}

	// 生成英文版本
	if generateEn {
		promptTemplate := s.settingRepo.GetValue("prompt_rewrite_en")
		prompt := strings.Replace(promptTemplate, "{{content}}", rawContent, -1)

		content, err := s.callPOE(prompt, model, false)
		if err != nil {
			return nil, fmt.Errorf("generate en failed: %w", err)
		}
		result.ContentEn = content
	}

	return result, nil
}

// SearchWeb 使用 POE Web-Search 模型从全网搜索超级个体变现案例
func (s *AIService) SearchWeb(query string) (*SearchResult, error) {
	// 使用 POE 的 Web-Search 模型（全网搜索能力）
	model := "Web-Search"

	// 构建搜索 prompt - 要求结构化输出
	searchPrompt := fmt.Sprintf(`搜索2024-2025年关于以下主题的真实成功案例：

搜索主题：%s

要求：
1. 返回真实的案例和文章链接
2. 包含具体收入数据（MRR、ARR、月收入等）
3. 来源可以是博客、Twitter、Reddit、IndieHackers、少数派、人人都是产品经理等

请返回 50 个案例，严格按以下JSON格式：

{"items":[
{"author":"作者名","content":"案例摘要(50-100字)","url":"真实链接","revenue":"收入数据","engagement":"来源平台"},
{"author":"作者名","content":"案例摘要","url":"链接","revenue":"收入","engagement":"平台"}
]}

只返回JSON，不要其他文字。`, query)

	content, err := s.callPOESimple(searchPrompt, model)
	if err != nil {
		return nil, fmt.Errorf("search failed: %w", err)
	}

	// 解析 JSON 结果
	var result SearchResult

	// 尝试提取 JSON（可能被包裹在 markdown 代码块中）
	jsonContent := content

	// 去掉 markdown 代码块标记
	if strings.Contains(content, "```json") {
		start := strings.Index(content, "```json") + 7
		end := strings.LastIndex(content, "```")
		if end > start {
			jsonContent = strings.TrimSpace(content[start:end])
		}
	} else if strings.Contains(content, "```") {
		start := strings.Index(content, "```") + 3
		end := strings.LastIndex(content, "```")
		if end > start {
			jsonContent = strings.TrimSpace(content[start:end])
		}
	}

	// 尝试找到 JSON 对象
	jsonStart := strings.Index(jsonContent, "{")
	jsonEnd := strings.LastIndex(jsonContent, "}")
	if jsonStart >= 0 && jsonEnd > jsonStart {
		jsonStr := jsonContent[jsonStart : jsonEnd+1]
		if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
			fmt.Printf("[SearchTwitter] JSON parse error: %v, content: %s\n", err, jsonStr[:min(200, len(jsonStr))])
			// 如果解析失败，返回原始内容作为单条结果
			result.Items = []SearchItem{{
				Content: content,
				Author:  "Web-Search",
			}}
		}
	} else {
		// 没有找到 JSON，返回原始内容
		result.Items = []SearchItem{{
			Content: content,
			Author:  "Web-Search",
		}}
	}

	return &result, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Chat 通用聊天方法
func (s *AIService) Chat(model, prompt string) (string, error) {
	return s.callPOESimple(prompt, model)
}

// callPOESimple 简单调用 POE API（不使用工具）
func (s *AIService) callPOESimple(prompt, model string) (string, error) {
	apiKey := s.cfg.POEApiKey
	if apiKey == "" {
		return s.mockSearchResponse(), nil
	}

	reqBody := map[string]interface{}{
		"model": model,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
		"temperature": 0.7,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	fmt.Printf("[POE API] Simple Request to %s\n", model)

	req, err := http.NewRequest("POST", "https://api.poe.com/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	fmt.Printf("[POE API] Response status: %d\n", resp.StatusCode)

	var poeResp poeResponse
	if err := json.Unmarshal(body, &poeResp); err != nil {
		return "", fmt.Errorf("parse response failed: %w", err)
	}

	if poeResp.Error != nil {
		return "", fmt.Errorf("POE API error: %s", poeResp.Error.Message)
	}

	if len(poeResp.Choices) == 0 {
		return "", fmt.Errorf("no response from POE API")
	}

	return poeResp.Choices[0].Message.Content, nil
}

// POE API 请求结构
type poeRequest struct {
	Model       string       `json:"model"`
	Messages    []poeMessage `json:"messages"`
	Tools       []poeTool    `json:"tools,omitempty"`
	Temperature float64      `json:"temperature,omitempty"`
}

type poeMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type poeTool struct {
	Type     string      `json:"type"`
	Function poeFunction `json:"function"`
}

type poeFunction struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
}

type poeResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// callPOE 调用 POE API
func (s *AIService) callPOE(prompt, model string, useXSearch bool) (string, error) {
	apiKey := s.cfg.POEApiKey
	if apiKey == "" {
		// 如果没有配置 API Key，返回模拟数据（用于测试）
		if useXSearch {
			return s.mockSearchResponse(), nil
		}
		return s.mockResponse(prompt), nil
	}

	// 获取温度配置
	temperature := 0.7
	if tempStr := s.settingRepo.GetValue("ai_temperature"); tempStr != "" {
		fmt.Sscanf(tempStr, "%f", &temperature)
	}

	// POE API 兼容 OpenAI 格式
	reqBody := poeRequest{
		Model: model,
		Messages: []poeMessage{
			{Role: "user", Content: prompt},
		},
		Temperature: temperature,
	}

	// 如果使用 x_keyword_search 工具（Grok 4 专用）
	if useXSearch {
		reqBody.Tools = []poeTool{
			{
				Type: "function",
				Function: poeFunction{
					Name:        "x_keyword_search",
					Description: "在 X (Twitter) 上高级搜索帖子，支持 since: until: 等时间过滤。",
					Parameters: map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"query": map[string]interface{}{
								"type":        "string",
								"description": "搜索查询，如 '超级个体 变现 since:2026-01-19'",
							},
							"limit": map[string]interface{}{
								"type":        "integer",
								"description": "返回帖子数量，默认10",
							},
							"mode": map[string]interface{}{
								"type":        "string",
								"enum":        []string{"Top", "Latest"},
								"description": "排序：Latest 获取最新",
							},
						},
						"required": []string{"query"},
					},
				},
			},
		}
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	// 调试：打印请求体
	fmt.Printf("[POE API] Request: %s\n", string(jsonData))

	// POE API endpoint
	req, err := http.NewRequest("POST", "https://api.poe.com/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	// 调试：打印响应体
	fmt.Printf("[POE API] Response status: %d, body: %s\n", resp.StatusCode, string(body))

	var poeResp poeResponse
	if err := json.Unmarshal(body, &poeResp); err != nil {
		return "", err
	}

	if poeResp.Error != nil {
		return "", fmt.Errorf("POE API error: %s", poeResp.Error.Message)
	}

	if len(poeResp.Choices) == 0 {
		return "", fmt.Errorf("no response from POE API")
	}

	return poeResp.Choices[0].Message.Content, nil
}

// mockResponse 模拟响应（用于测试）
func (s *AIService) mockResponse(prompt string) string {
	if strings.Contains(prompt, "中文") || strings.Contains(prompt, "Chinese") {
		return `🔥 又一个 AI 时代的超级个体成功案例！

一个人，3个月，从0到月入 $15K 💰

他做了什么？
→ 用 AI 做了一个自动化工具
→ 技术栈：Next.js + OpenAI API
→ 获客：全靠 Twitter 和 Product Hunt

成本：$50/月
收入：$15K/月

这就是 AI 时代的杠杆效应 🚀

你觉得这种模式可复制吗？👇`
	}

	return `🔥 Another AI-era solopreneur success story!

One person, 3 months, from $0 to $15K MRR 💰

What they did:
→ Built an AI automation tool
→ Tech stack: Next.js + OpenAI API
→ Acquisition: Twitter + Product Hunt

Cost: $50/mo
Revenue: $15K/mo

This is the power of AI leverage 🚀

Would you try this approach? 👇`
}

// mockSearchResponse 模拟搜索响应（用于测试）
func (s *AIService) mockSearchResponse() string {
	return `{
  "items": [
    {
      "author": "@levelsio",
      "content": "PhotoAI just crossed $100K MRR 🎉 Built it solo in 4 months. Stack: Next.js, Replicate, Stripe. No VC, no team, just vibes.",
      "url": "https://x.com/levelsio/status/123456789",
      "revenue": "$100K MRR",
      "engagement": "2.5K likes, 342 retweets"
    },
    {
      "author": "@marc_louvion",
      "content": "ShipFast hit $50K in sales this month. It's a Next.js boilerplate I built to help devs launch faster. Took 2 weeks to build v1.",
      "url": "https://x.com/marc_louvion/status/987654321",
      "revenue": "$50K/month",
      "engagement": "1.8K likes, 256 retweets"
    },
    {
      "author": "@tdinh_me",
      "content": "My AI writing tool is now making $8K MRR. Started as a weekend project 6 months ago. The best part? It runs on autopilot.",
      "url": "https://x.com/tdinh_me/status/456789123",
      "revenue": "$8K MRR",
      "engagement": "892 likes, 124 retweets"
    }
  ]
}`
}

// ExpandKeywordsResult 关键词扩展结果
type ExpandKeywordsResult struct {
	Keywords []string `json:"keywords"`
}

// ExpandKeywords 使用 AI 扩展种子关键词
func (s *AIService) ExpandKeywords(seedKeyword string, count int) ([]string, error) {
	model := "GPT-4o"

	prompt := fmt.Sprintf(`你是一个搜索关键词专家。基于以下种子词，生成 %d 个相关的搜索关键词变体。

种子词：%s

要求：
1. 生成的关键词要覆盖中文和英文
2. 包含不同的表达方式和同义词
3. 关键词要适合搜索独立开发者/超级个体的成功案例和收入分享
4. 每个关键词应该能搜索到有价值的真实案例

请严格按以下 JSON 格式返回：
{"keywords":["关键词1","关键词2","keyword3","keyword4"]}

只返回 JSON，不要其他文字。`, count, seedKeyword)

	content, err := s.callPOESimple(prompt, model)
	if err != nil {
		return nil, fmt.Errorf("expand keywords failed: %w", err)
	}

	// 解析 JSON
	jsonContent := content
	if strings.Contains(content, "```json") {
		start := strings.Index(content, "```json") + 7
		end := strings.LastIndex(content, "```")
		if end > start {
			jsonContent = strings.TrimSpace(content[start:end])
		}
	} else if strings.Contains(content, "```") {
		start := strings.Index(content, "```") + 3
		end := strings.LastIndex(content, "```")
		if end > start {
			jsonContent = strings.TrimSpace(content[start:end])
		}
	}

	jsonStart := strings.Index(jsonContent, "{")
	jsonEnd := strings.LastIndex(jsonContent, "}")
	if jsonStart >= 0 && jsonEnd > jsonStart {
		jsonStr := jsonContent[jsonStart : jsonEnd+1]
		var result ExpandKeywordsResult
		if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
			return nil, fmt.Errorf("parse keywords failed: %w", err)
		}
		return result.Keywords, nil
	}

	return nil, fmt.Errorf("invalid response format")
}
