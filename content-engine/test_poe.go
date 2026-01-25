package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	// 加载 .env 文件
	godotenv.Load()

	apiKey := os.Getenv("POE_API_KEY")
	if apiKey == "" {
		fmt.Println("❌ POE_API_KEY 未设置")
		return
	}
	fmt.Printf("✅ API Key: %s...%s\n", apiKey[:10], apiKey[len(apiKey)-5:])

	// 测试8: 使用 Web-Search 模型搜索主题相关内容
	fmt.Println("\n========== 测试8: Web-Search 模型 ==========")
	testWebSearchModel(apiKey)
}

func testSimpleChat(apiKey string) {
	reqBody := map[string]interface{}{
		"model": "GPT-4",
		"messages": []map[string]string{
			{"role": "user", "content": "你好，请用一句话介绍自己"},
		},
		"temperature": 0.7,
	}

	result, err := callPOE(apiKey, reqBody)
	if err != nil {
		fmt.Printf("❌ 错误: %v\n", err)
		return
	}
	fmt.Printf("✅ 响应: %s\n", result)
}

func testXSearch(apiKey string) {
	// 使用 Grok-4 模型和 x_keyword_search 工具
	reqBody := map[string]interface{}{
		"model": "Grok-4",
		"messages": []map[string]string{
			{
				"role":    "system",
				"content": "你是一个专注 AI 时代超级个体变现的助手。使用 x_keyword_search 工具搜索 X/Twitter 上的最新讨论。",
			},
			{
				"role":    "user",
				"content": "请搜索 X 上关于 '超级个体 AI 变现' 的最新帖子，返回5条结果",
			},
		},
		"tools": []map[string]interface{}{
			{
				"type": "function",
				"function": map[string]interface{}{
					"name":        "x_keyword_search",
					"description": "在 X (Twitter) 上高级搜索帖子",
					"parameters": map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"query": map[string]interface{}{
								"type":        "string",
								"description": "搜索查询",
							},
							"limit": map[string]interface{}{
								"type":        "integer",
								"description": "返回帖子数量",
							},
							"mode": map[string]interface{}{
								"type": "string",
								"enum": []string{"Top", "Latest"},
							},
						},
						"required": []string{"query"},
					},
				},
			},
		},
		"tool_choice": "auto",
		"temperature": 0.7,
	}

	result, err := callPOE(apiKey, reqBody)
	if err != nil {
		fmt.Printf("❌ 错误: %v\n", err)
		return
	}
	fmt.Printf("✅ 响应: %s\n", result)
}

func callPOE(apiKey string, reqBody map[string]interface{}) (string, error) {
	jsonData, err := json.MarshalIndent(reqBody, "", "  ")
	if err != nil {
		return "", err
	}
	fmt.Printf("📤 请求体:\n%s\n\n", string(jsonData))

	req, err := http.NewRequest("POST", "https://api.poe.com/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("HTTP 请求失败: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	fmt.Printf("📥 HTTP 状态: %d\n", resp.StatusCode)
	fmt.Printf("📥 原始响应:\n%s\n", string(body))

	// 格式化 JSON 输出
	var prettyJSON bytes.Buffer
	if err := json.Indent(&prettyJSON, body, "", "  "); err == nil {
		return prettyJSON.String(), nil
	}

	return string(body), nil
}

// 测试3: 不传工具定义，直接让 Grok 搜索
func testDirectSearch(apiKey string) {
	reqBody := map[string]interface{}{
		"model": "Grok-4",
		"messages": []map[string]string{
			{
				"role":    "user",
				"content": "请搜索 X/Twitter 上关于 '超级个体 AI 变现' 的最新帖子，返回实际的搜索结果",
			},
		},
		"temperature": 0.7,
	}

	result, err := callPOE(apiKey, reqBody)
	if err != nil {
		fmt.Printf("❌ 错误: %v\n", err)
		return
	}
	fmt.Printf("✅ 响应: %s\n", result)
}

// 测试4: 完整工具调用流程
func testFullToolCall(apiKey string) {
	tools := []map[string]interface{}{
		{
			"type": "function",
			"function": map[string]interface{}{
				"name":        "x_keyword_search",
				"description": "在 X (Twitter) 上高级搜索帖子",
				"parameters": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"query": map[string]interface{}{
							"type":        "string",
							"description": "搜索查询",
						},
						"limit": map[string]interface{}{
							"type":        "integer",
							"description": "返回帖子数量",
						},
						"mode": map[string]interface{}{
							"type": "string",
							"enum": []string{"Top", "Latest"},
						},
					},
					"required": []string{"query"},
				},
			},
		},
	}

	// 第一轮：发起请求，模型返回 tool_calls
	reqBody1 := map[string]interface{}{
		"model": "Grok-4",
		"messages": []map[string]interface{}{
			{
				"role":    "system",
				"content": "你是一个专注 AI 时代超级个体变现的助手。使用 x_keyword_search 工具搜索 X/Twitter 上的最新讨论。",
			},
			{
				"role":    "user",
				"content": "请搜索 X 上关于 '超级个体 AI 变现' 的最新帖子",
			},
		},
		"tools":       tools,
		"tool_choice": "auto",
		"temperature": 0.7,
	}

	fmt.Println("🔄 第一轮请求...")
	resp1, err := callPOERaw(apiKey, reqBody1)
	if err != nil {
		fmt.Printf("❌ 第一轮错误: %v\n", err)
		return
	}

	// 解析第一轮响应，获取 tool_calls
	var result1 struct {
		Choices []struct {
			Message struct {
				Role      string `json:"role"`
				Content   string `json:"content"`
				ToolCalls []struct {
					ID       string `json:"id"`
					Type     string `json:"type"`
					Function struct {
						Name      string `json:"name"`
						Arguments string `json:"arguments"`
					} `json:"function"`
				} `json:"tool_calls"`
			} `json:"message"`
			FinishReason string `json:"finish_reason"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(resp1, &result1); err != nil {
		fmt.Printf("❌ 解析响应失败: %v\n", err)
		return
	}

	if len(result1.Choices) == 0 || len(result1.Choices[0].Message.ToolCalls) == 0 {
		fmt.Println("❌ 没有 tool_calls")
		fmt.Printf("响应内容: %s\n", result1.Choices[0].Message.Content)
		return
	}

	toolCall := result1.Choices[0].Message.ToolCalls[0]
	fmt.Printf("✅ 模型请求调用工具: %s\n", toolCall.Function.Name)
	fmt.Printf("   参数: %s\n", toolCall.Function.Arguments)

	// 第二轮：把 assistant 的 tool_calls 和 tool 的执行结果发回去
	// 注意：POE 的 Grok-4 应该是服务端执行工具的，我们只需要等待
	// 但如果 POE 需要我们提供工具结果，我们模拟一个

	reqBody2 := map[string]interface{}{
		"model": "Grok-4",
		"messages": []map[string]interface{}{
			{
				"role":    "system",
				"content": "你是一个专注 AI 时代超级个体变现的助手。",
			},
			{
				"role":    "user",
				"content": "请搜索 X 上关于 '超级个体 AI 变现' 的最新帖子",
			},
			{
				"role":    "assistant",
				"content": "",
				"tool_calls": []map[string]interface{}{
					{
						"id":   toolCall.ID,
						"type": "function",
						"function": map[string]string{
							"name":      toolCall.Function.Name,
							"arguments": toolCall.Function.Arguments,
						},
					},
				},
			},
			{
				"role":         "tool",
				"tool_call_id": toolCall.ID,
				"content":      `搜索结果: 找到5条相关帖子...（这里是搜索结果）`,
			},
		},
		"tools":       tools,
		"temperature": 0.7,
	}

	fmt.Println("\n🔄 第二轮请求（提交工具结果）...")
	resp2, err := callPOERaw(apiKey, reqBody2)
	if err != nil {
		fmt.Printf("❌ 第二轮错误: %v\n", err)
		return
	}

	// 格式化输出
	var prettyJSON bytes.Buffer
	json.Indent(&prettyJSON, resp2, "", "  ")
	fmt.Printf("✅ 最终响应:\n%s\n", prettyJSON.String())
}

func callPOERaw(apiKey string, reqBody map[string]interface{}) ([]byte, error) {
	jsonData, err := json.MarshalIndent(reqBody, "", "  ")
	if err != nil {
		return nil, err
	}
	fmt.Printf("📤 请求体:\n%s\n\n", string(jsonData))

	req, err := http.NewRequest("POST", "https://api.poe.com/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP 请求失败: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	fmt.Printf("📥 HTTP 状态: %d\n", resp.StatusCode)
	fmt.Printf("📥 原始响应: %s\n", string(body))

	return body, nil
}

// 测试5: 测试带搜索能力的模型
func testWebSearch(apiKey string) {
	// 尝试不同的可能支持搜索的模型
	models := []string{"Grok-3-Web", "Web-Search", "Claude-4.5-Sonnet"}

	for _, model := range models {
		fmt.Printf("\n--- 测试模型: %s ---\n", model)
		reqBody := map[string]interface{}{
			"model": model,
			"messages": []map[string]string{
				{
					"role":    "user",
					"content": "请搜索 Twitter/X 上关于 '超级个体 AI 变现' 的最新帖子，返回实际的搜索结果（最近3天）",
				},
			},
			"temperature": 0.7,
		}

		resp, err := callPOERaw(apiKey, reqBody)
		if err != nil {
			fmt.Printf("❌ 错误: %v\n", err)
			continue
		}

		// 尝试解析并显示内容
		var result struct {
			Choices []struct {
				Message struct {
					Content string `json:"content"`
				} `json:"message"`
			} `json:"choices"`
			Error *struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		if err := json.Unmarshal(resp, &result); err == nil {
			if result.Error != nil {
				fmt.Printf("❌ API 错误: %s\n", result.Error.Message)
			} else if len(result.Choices) > 0 {
				content := result.Choices[0].Message.Content
				// 解码 unicode
				fmt.Printf("✅ 内容预览 (前500字):\n%s\n", truncateString(content, 500))
			}
		}
	}
}

func truncateString(s string, maxLen int) string {
	runes := []rune(s)
	if len(runes) <= maxLen {
		return s
	}
	return string(runes[:maxLen]) + "..."
}

// 测试6: 直接询问 Grok-4 搜索 X 上热门内容
func testGrokDirectSearch(apiKey string) {
	reqBody := map[string]interface{}{
		"model": "Grok-4",
		"messages": []map[string]string{
			{
				"role": "user",
				"content": `请搜索 X/Twitter 上关于 "AI 时代超级个体变现" 或 "AI side hustle" 或 "indie hacker revenue" 的热门帖子。

要求：
1. 返回最近3天（2026年1月18日-21日）发布的真实帖子
2. 包含具体的收入数据（MRR、ARR、月收入等）
3. 优先选择互动量高的帖子

请按以下格式返回 5 条帖子：

帖子1:
- 作者: @xxx
- 日期: 2026-01-xx
- 内容: xxx
- 收入数据: xxx
- 链接: https://x.com/xxx/status/xxx
- 互动: xxx likes, xxx retweets

帖子2:
...`,
			},
		},
		"temperature": 0.7,
	}

	resp, err := callPOERaw(apiKey, reqBody)
	if err != nil {
		fmt.Printf("❌ 错误: %v\n", err)
		return
	}

	// 解析并显示内容
	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(resp, &result); err == nil {
		if result.Error != nil {
			fmt.Printf("❌ API 错误: %s\n", result.Error.Message)
		} else if len(result.Choices) > 0 {
			content := result.Choices[0].Message.Content
			fmt.Printf("\n✅ Grok-4 返回内容:\n%s\n", content)
		}
	}
}

// 测试7: 强制使用工具调用（让 POE 服务端执行搜索）
func testForceToolCall(apiKey string) {
	tools := []map[string]interface{}{
		{
			"type": "function",
			"function": map[string]interface{}{
				"name":        "x_keyword_search",
				"description": "在 X (Twitter) 上搜索帖子，支持关键词和时间过滤",
				"parameters": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"query": map[string]interface{}{
							"type":        "string",
							"description": "搜索关键词",
						},
						"limit": map[string]interface{}{
							"type":        "integer",
							"description": "返回数量",
						},
						"mode": map[string]interface{}{
							"type": "string",
							"enum": []string{"Top", "Latest"},
						},
					},
					"required": []string{"query"},
				},
			},
		},
	}

	// 使用 tool_choice 强制调用指定工具
	reqBody := map[string]interface{}{
		"model": "Grok-4",
		"messages": []map[string]string{
			{
				"role":    "user",
				"content": "搜索 X 上最近3天关于 'indie hacker revenue' 的热门帖子，返回5条包含收入数据的真实帖子",
			},
		},
		"tools": tools,
		"tool_choice": map[string]interface{}{
			"type": "function",
			"function": map[string]string{
				"name": "x_keyword_search",
			},
		},
		"temperature": 0.7,
	}

	fmt.Println("📤 发送请求（强制使用 x_keyword_search 工具）...")
	resp, err := callPOERaw(apiKey, reqBody)
	if err != nil {
		fmt.Printf("❌ 错误: %v\n", err)
		return
	}

	// 解析响应
	var result struct {
		Choices []struct {
			Message struct {
				Content   string `json:"content"`
				ToolCalls []struct {
					ID       string `json:"id"`
					Type     string `json:"type"`
					Function struct {
						Name      string `json:"name"`
						Arguments string `json:"arguments"`
					} `json:"function"`
				} `json:"tool_calls"`
			} `json:"message"`
			FinishReason string `json:"finish_reason"`
		} `json:"choices"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}

	if err := json.Unmarshal(resp, &result); err != nil {
		fmt.Printf("❌ 解析失败: %v\n", err)
		return
	}

	if result.Error != nil {
		fmt.Printf("❌ API 错误: %s\n", result.Error.Message)
		return
	}

	if len(result.Choices) == 0 {
		fmt.Println("❌ 无响应")
		return
	}

	choice := result.Choices[0]
	fmt.Printf("📥 Finish Reason: %s\n", choice.FinishReason)

	if len(choice.Message.ToolCalls) > 0 {
		tc := choice.Message.ToolCalls[0]
		fmt.Printf("🔧 工具调用: %s\n", tc.Function.Name)
		fmt.Printf("🔧 参数: %s\n", tc.Function.Arguments)
		fmt.Println("\n⚠️  POE API 返回了 tool_calls，但需要我们自己执行工具。")
		fmt.Println("   这说明 POE 不会自动执行 x_keyword_search。")
	}

	if choice.Message.Content != "" {
		fmt.Printf("📝 内容: %s\n", choice.Message.Content)
	}
}

// 测试8: Web-Search 模型搜索主题
func testWebSearchModel(apiKey string) {
	reqBody := map[string]interface{}{
		"model": "Web-Search",
		"messages": []map[string]string{
			{
				"role": "user",
				"content": `搜索2024-2025年关于 "AI时代独立开发者/超级个体如何通过AI工具实现月入过万" 的真实成功案例。

要求：
1. 返回真实的案例和文章链接
2. 包含具体收入数据
3. 来源可以是博客、Twitter、Reddit、IndieHackers等

请返回 5 个案例，格式如下：

案例1:
- 来源: xxx
- 作者: xxx
- 标题: xxx
- 收入数据: xxx
- 核心方法: xxx
- 链接: https://xxx

案例2:
...`,
			},
		},
		"temperature": 0.7,
	}

	fmt.Println("📤 使用 Web-Search 模型搜索...")
	resp, err := callPOERaw(apiKey, reqBody)
	if err != nil {
		fmt.Printf("❌ 错误: %v\n", err)
		return
	}

	// 解析并显示内容
	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}

	if err := json.Unmarshal(resp, &result); err == nil {
		if result.Error != nil {
			fmt.Printf("❌ API 错误: %s\n", result.Error.Message)
		} else if len(result.Choices) > 0 {
			content := result.Choices[0].Message.Content
			fmt.Printf("\n✅ Web-Search 返回内容:\n%s\n", content)
		}
	}
}
