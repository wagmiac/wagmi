package services

import (
	"content-engine/internal/config"
	"content-engine/internal/models"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"
)

// PHService Product Hunt API 服务
type PHService struct {
	cfg         *config.Config
	db          *gorm.DB
	accessToken string
	tokenExpiry time.Time
	tokenMutex  sync.RWMutex
}

// NewPHService 创建 PH 服务
func NewPHService(cfg *config.Config, db *gorm.DB) *PHService {
	return &PHService{
		cfg:         cfg,
		db:          db,
		accessToken: "",
		tokenExpiry: time.Time{},
	}
}

// getAccessToken 获取有效的 Access Token（使用 Client Credentials 流程）
func (s *PHService) getAccessToken() (string, error) {
	s.tokenMutex.RLock()
	if s.accessToken != "" && time.Now().Before(s.tokenExpiry) {
		token := s.accessToken
		s.tokenMutex.RUnlock()
		return token, nil
	}
	s.tokenMutex.RUnlock()

	// 需要获取新 token
	s.tokenMutex.Lock()
	defer s.tokenMutex.Unlock()

	// 双重检查
	if s.accessToken != "" && time.Now().Before(s.tokenExpiry) {
		return s.accessToken, nil
	}

	log.Println("[PHService] Fetching new access token...")

	// OAuth 2.0 Client Credentials 请求
	data := url.Values{}
	data.Set("client_id", s.cfg.PHClientID)
	data.Set("client_secret", s.cfg.PHClientSecret)
	data.Set("grant_type", "client_credentials")

	req, err := http.NewRequest("POST", "https://api.producthunt.com/v2/oauth/token", strings.NewReader(data.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	log.Printf("[PHService] OAuth response status: %d", resp.StatusCode)

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("OAuth error: %s", string(body))
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
		Scope       string `json:"scope"`
		CreatedAt   int64  `json:"created_at"`
	}

	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", fmt.Errorf("failed to parse token response: %w", err)
	}

	s.accessToken = tokenResp.AccessToken
	// Token 有效期设为 23 小时（实际可能更长，但保守一点）
	s.tokenExpiry = time.Now().Add(23 * time.Hour)

	log.Printf("[PHService] Got access token: %s...", s.accessToken[:10])
	return s.accessToken, nil
}

// PHGraphQLResponse GraphQL 响应结构
type PHGraphQLResponse struct {
	Data   map[string]interface{} `json:"data"`
	Errors []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

// FetchProduct 从 Product Hunt 获取产品数据
func (s *PHService) FetchProduct(phURL string) (*models.PHProduct, error) {
	// 从 URL 提取 slug
	slug := s.extractSlug(phURL)
	if slug == "" {
		return nil, fmt.Errorf("invalid Product Hunt URL: %s", phURL)
	}

	// 检查是否已存在
	var existing models.PHProduct
	if err := s.db.Where("slug = ?", slug).First(&existing).Error; err == nil {
		// 如果最近 24 小时内已获取，直接返回
		if time.Since(existing.UpdatedAt) < 24*time.Hour {
			return &existing, nil
		}
	}

	// 调用 Product Hunt GraphQL API
	product, err := s.fetchFromAPI(slug)
	if err != nil {
		return nil, err
	}

	// 保存或更新到数据库
	if existing.ID != "" {
		product.ID = existing.ID
		s.db.Save(product)
	} else {
		s.db.Create(product)
	}

	return product, nil
}

// extractSlug 从 URL 提取 slug
func (s *PHService) extractSlug(phURL string) string {
	// 支持格式:
	// https://www.producthunt.com/products/blender
	// https://www.producthunt.com/posts/blender-4-0
	phURL = strings.TrimSuffix(phURL, "/")

	if strings.Contains(phURL, "/products/") {
		parts := strings.Split(phURL, "/products/")
		if len(parts) > 1 {
			return parts[1]
		}
	}

	if strings.Contains(phURL, "/posts/") {
		parts := strings.Split(phURL, "/posts/")
		if len(parts) > 1 {
			return parts[1]
		}
	}

	return ""
}

// fetchFromAPI 从 Product Hunt API 获取数据
func (s *PHService) fetchFromAPI(slug string) (*models.PHProduct, error) {
	log.Printf("[PHService] fetchFromAPI: trying to fetch slug=%s", slug)

	// 先尝试用 post 查询，失败后用 product 查询
	product, err := s.fetchPostFromAPI(slug)
	if err != nil {
		log.Printf("[PHService] post query failed: %v, trying product query", err)
		// 尝试用 product 查询
		product, err = s.fetchProductFromAPI(slug)
		if err != nil {
			log.Printf("[PHService] product query also failed: %v", err)
			return nil, err
		}
	}
	log.Printf("[PHService] fetchFromAPI: success, product=%s", product.Name)
	return product, nil
}

// fetchPostFromAPI 通过 post slug 查询
func (s *PHService) fetchPostFromAPI(slug string) (*models.PHProduct, error) {
	// Product Hunt GraphQL API
	apiURL := "https://api.producthunt.com/v2/api/graphql"

	// GraphQL 查询
	query := `
	query getPost($slug: String!) {
		post(slug: $slug) {
			id
			slug
			name
			tagline
			description
			url
			thumbnail {
				url
			}
			votesCount
			commentsCount
			reviewsCount
			topics {
				edges {
					node {
						name
					}
				}
			}
			makers {
				id
				name
				headline
				twitterUsername
				madePosts {
					totalCount
				}
			}
			featuredAt
		}
	}
	`

	return s.executeGraphQL(apiURL, query, slug, "post")
}

// fetchProductFromAPI 通过 product slug 查询
func (s *PHService) fetchProductFromAPI(slug string) (*models.PHProduct, error) {
	apiURL := "https://api.producthunt.com/v2/api/graphql"

	// 用 product 查询 - 获取最新的 post
	query := `
	query getProduct($slug: String!) {
		product(slug: $slug) {
			id
			slug
			name
			tagline
			description
			website
			thumbnail {
				url
			}
			followersCount
			reviewsCount
			posts(first: 1) {
				edges {
					node {
						id
						slug
						votesCount
						commentsCount
						featuredAt
						makers {
							id
							name
							headline
							twitterUsername
							madePosts {
								totalCount
							}
						}
					}
				}
			}
			topics {
				edges {
					node {
						name
					}
				}
			}
		}
	}
	`

	return s.executeGraphQL(apiURL, query, slug, "product")
}

// executeGraphQL 执行 GraphQL 查询
func (s *PHService) executeGraphQL(apiURL, query, slug, queryType string) (*models.PHProduct, error) {
	log.Printf("[PHService] executeGraphQL: queryType=%s, slug=%s", queryType, slug)

	reqBody := map[string]interface{}{
		"query": query,
		"variables": map[string]string{
			"slug": slug,
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", apiURL, strings.NewReader(string(jsonData)))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")

	// 使用 OAuth 获取的 Access Token
	accessToken, err := s.getAccessToken()
	if err != nil {
		return nil, fmt.Errorf("failed to get access token: %w", err)
	}
	log.Printf("[PHService] Using Access Token: %s...", accessToken[:10])
	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	log.Printf("[PHService] API response status: %d", resp.StatusCode)

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	log.Printf("[PHService] API response body: %s", string(body)[:min(500, len(body))])

	// 解析响应
	var graphQLResp PHGraphQLResponse
	if err := json.Unmarshal(body, &graphQLResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(graphQLResp.Errors) > 0 {
		return nil, fmt.Errorf("GraphQL error: %s", graphQLResp.Errors[0].Message)
	}

	// 提取产品数据 - 根据查询类型使用不同的 key
	var postData map[string]interface{}
	var ok bool
	if queryType == "product" {
		postData, ok = graphQLResp.Data["product"].(map[string]interface{})
	} else {
		postData, ok = graphQLResp.Data["post"].(map[string]interface{})
	}
	if !ok || postData == nil {
		return nil, fmt.Errorf("product not found: %s", slug)
	}

	return s.parseProductData(postData, string(body))
}

// parseProductData 解析产品数据
func (s *PHService) parseProductData(data map[string]interface{}, rawData string) (*models.PHProduct, error) {
	product := &models.PHProduct{
		RawData: rawData,
	}

	// 基础字段
	if v, ok := data["id"].(string); ok {
		product.PHID = v
	}
	if v, ok := data["slug"].(string); ok {
		product.Slug = v
	}
	if v, ok := data["name"].(string); ok {
		product.Name = v
	}
	if v, ok := data["tagline"].(string); ok {
		product.Tagline = v
	}
	if v, ok := data["description"].(string); ok {
		product.Description = v
	}
	if v, ok := data["url"].(string); ok {
		product.URL = v
	}

	// 缩略图
	if thumb, ok := data["thumbnail"].(map[string]interface{}); ok {
		if v, ok := thumb["url"].(string); ok {
			product.Thumbnail = v
		}
	}

	// 社交数据
	if v, ok := data["votesCount"].(float64); ok {
		product.Upvotes = int(v)
	}
	if v, ok := data["commentsCount"].(float64); ok {
		product.CommentsCount = int(v)
	}
	if v, ok := data["reviewsCount"].(float64); ok {
		product.ReviewsCount = int(v)
	}

	// 标签
	if topics, ok := data["topics"].(map[string]interface{}); ok {
		if edges, ok := topics["edges"].([]interface{}); ok {
			var topicNames []string
			for _, edge := range edges {
				if e, ok := edge.(map[string]interface{}); ok {
					if node, ok := e["node"].(map[string]interface{}); ok {
						if name, ok := node["name"].(string); ok {
							topicNames = append(topicNames, name)
						}
					}
				}
			}
			product.Topics = models.JSONArray(topicNames)
		}
	}

	// Maker 信息（取第一个 maker）
	if makers, ok := data["makers"].([]interface{}); ok && len(makers) > 0 {
		if maker, ok := makers[0].(map[string]interface{}); ok {
			if v, ok := maker["name"].(string); ok {
				product.MakerName = v
			}
			if v, ok := maker["headline"].(string); ok {
				product.MakerHeadline = v
			}
			if v, ok := maker["twitterUsername"].(string); ok {
				product.MakerTwitter = v
			}
			if madePosts, ok := maker["madePosts"].(map[string]interface{}); ok {
				if v, ok := madePosts["totalCount"].(float64); ok {
					product.MakerProductsCount = int(v)
				}
			}
		}
	}

	// 发布时间
	if v, ok := data["featuredAt"].(string); ok && v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			product.FeaturedAt = &t
		}
	}

	return product, nil
}

// GetProductBySlug 根据 slug 获取产品
func (s *PHService) GetProductBySlug(slug string) (*models.PHProduct, error) {
	var product models.PHProduct
	if err := s.db.Where("slug = ?", slug).First(&product).Error; err != nil {
		return nil, err
	}
	return &product, nil
}

// GetProductByID 根据 ID 获取产品
func (s *PHService) GetProductByID(id string) (*models.PHProduct, error) {
	var product models.PHProduct
	if err := s.db.Where("id = ?", id).First(&product).Error; err != nil {
		return nil, err
	}
	return &product, nil
}
