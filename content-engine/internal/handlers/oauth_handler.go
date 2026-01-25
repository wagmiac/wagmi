package handlers

import (
	"content-engine/internal/config"
	"content-engine/internal/services"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// OAuthHandler OAuth 处理器
type OAuthHandler struct {
	authService *services.AuthService
	config      *config.Config
	stateStore  *StateStore
}

// StateStore 存储 OAuth state（防止 CSRF）
type StateStore struct {
	mu     sync.RWMutex
	states map[string]time.Time
}

func NewStateStore() *StateStore {
	s := &StateStore{
		states: make(map[string]time.Time),
	}
	// 定期清理过期 state
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			s.cleanup()
		}
	}()
	return s
}

func (s *StateStore) Generate() string {
	b := make([]byte, 32)
	rand.Read(b)
	state := base64.URLEncoding.EncodeToString(b)
	s.mu.Lock()
	s.states[state] = time.Now().Add(10 * time.Minute)
	s.mu.Unlock()
	return state
}

func (s *StateStore) Validate(state string) bool {
	s.mu.RLock()
	expiry, exists := s.states[state]
	s.mu.RUnlock()
	if !exists || time.Now().After(expiry) {
		return false
	}
	s.mu.Lock()
	delete(s.states, state)
	s.mu.Unlock()
	return true
}

func (s *StateStore) cleanup() {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	for state, expiry := range s.states {
		if now.After(expiry) {
			delete(s.states, state)
		}
	}
}

// NewOAuthHandler 创建处理器
func NewOAuthHandler(authService *services.AuthService, cfg *config.Config) *OAuthHandler {
	return &OAuthHandler{
		authService: authService,
		config:      cfg,
		stateStore:  NewStateStore(),
	}
}

// ==================== Google OAuth ====================

// GoogleAuthURL 返回 Google OAuth 授权 URL
func (h *OAuthHandler) GoogleAuthURL(c *gin.Context) {
	if h.config.GoogleClientID == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"error":   "Google OAuth not configured",
		})
		return
	}

	state := h.stateStore.Generate()

	params := url.Values{}
	params.Set("client_id", h.config.GoogleClientID)
	params.Set("redirect_uri", h.config.GoogleRedirectURL)
	params.Set("response_type", "code")
	params.Set("scope", "openid email profile")
	params.Set("state", state)
	params.Set("access_type", "offline")
	params.Set("prompt", "select_account")

	authURL := "https://accounts.google.com/o/oauth2/v2/auth?" + params.Encode()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"url":   authURL,
			"state": state,
		},
	})
}

// GoogleCallback Google OAuth 回调
func (h *OAuthHandler) GoogleCallback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")
	errorMsg := c.Query("error")

	callbackURL := h.config.FrontendURL + "/auth/callback"

	if errorMsg != "" {
		c.Redirect(http.StatusTemporaryRedirect, callbackURL+"?auth_error="+url.QueryEscape(errorMsg))
		return
	}

	if code == "" {
		c.Redirect(http.StatusTemporaryRedirect, callbackURL+"?auth_error=missing_code")
		return
	}

	if !h.stateStore.Validate(state) {
		c.Redirect(http.StatusTemporaryRedirect, callbackURL+"?auth_error=invalid_state")
		return
	}

	// 交换 code 获取 token
	tokenData, err := h.exchangeGoogleCode(code)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, callbackURL+"?auth_error="+url.QueryEscape(err.Error()))
		return
	}

	// 获取用户信息
	userInfo, err := h.getGoogleUserInfo(tokenData["access_token"].(string))
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, callbackURL+"?auth_error="+url.QueryEscape(err.Error()))
		return
	}

	// 查找或创建用户
	googleID := userInfo["sub"].(string)
	email := userInfo["email"].(string)
	name := ""
	if n, ok := userInfo["name"].(string); ok {
		name = n
	}
	avatar := ""
	if a, ok := userInfo["picture"].(string); ok {
		avatar = a
	}

	user, err := h.authService.FindOrCreateByGoogle(googleID, email, name, avatar)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, callbackURL+"?auth_error="+url.QueryEscape(err.Error()))
		return
	}

	// 生成 JWT
	token, err := h.authService.GenerateToken(user)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, callbackURL+"?auth_error="+url.QueryEscape(err.Error()))
		return
	}

	// 重定向到前端回调页面，带上 token
	c.Redirect(http.StatusTemporaryRedirect, callbackURL+"?auth_token="+token+"&auth_provider=google")
}

func (h *OAuthHandler) exchangeGoogleCode(code string) (map[string]interface{}, error) {
	data := url.Values{}
	data.Set("code", code)
	data.Set("client_id", h.config.GoogleClientID)
	data.Set("client_secret", h.config.GoogleClientSecret)
	data.Set("redirect_uri", h.config.GoogleRedirectURL)
	data.Set("grant_type", "authorization_code")

	resp, err := http.Post(
		"https://oauth2.googleapis.com/token",
		"application/x-www-form-urlencoded",
		strings.NewReader(data.Encode()),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse token response: %v", err)
	}

	if errMsg, ok := result["error"].(string); ok {
		return nil, fmt.Errorf("token error: %s", errMsg)
	}

	return result, nil
}

func (h *OAuthHandler) getGoogleUserInfo(accessToken string) (map[string]interface{}, error) {
	req, _ := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v3/userinfo", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse user info: %v", err)
	}

	return result, nil
}

// ==================== Twitter OAuth 2.0 ====================

// TwitterAuthURL 返回 Twitter OAuth 授权 URL
func (h *OAuthHandler) TwitterAuthURL(c *gin.Context) {
	if h.config.TwitterClientID == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"error":   "Twitter OAuth not configured",
		})
		return
	}

	state := h.stateStore.Generate()

	// Twitter OAuth 2.0 with PKCE
	codeVerifier := h.generateCodeVerifier()
	codeChallenge := h.generateCodeChallenge(codeVerifier)

	// 存储 code_verifier（与 state 关联）
	h.stateStore.mu.Lock()
	h.stateStore.states["verifier_"+state] = time.Now().Add(10 * time.Minute)
	h.stateStore.mu.Unlock()

	params := url.Values{}
	params.Set("response_type", "code")
	params.Set("client_id", h.config.TwitterClientID)
	params.Set("redirect_uri", h.config.TwitterRedirectURL)
	params.Set("scope", "tweet.read users.read offline.access")
	params.Set("state", state)
	params.Set("code_challenge", codeChallenge)
	params.Set("code_challenge_method", "S256")

	authURL := "https://x.com/i/oauth2/authorize?" + params.Encode()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"url":           authURL,
			"state":         state,
			"code_verifier": codeVerifier,
		},
	})
}

// TwitterCallback Twitter OAuth 回调
func (h *OAuthHandler) TwitterCallback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")
	errorMsg := c.Query("error")
	codeVerifier := c.Query("code_verifier") // 从 cookie 或 session 获取

	callbackURL := h.config.FrontendURL + "/auth/callback"

	if errorMsg != "" {
		c.Redirect(http.StatusTemporaryRedirect, callbackURL+"?auth_error="+url.QueryEscape(errorMsg))
		return
	}

	if code == "" {
		c.Redirect(http.StatusTemporaryRedirect, callbackURL+"?auth_error=missing_code")
		return
	}

	if !h.stateStore.Validate(state) {
		c.Redirect(http.StatusTemporaryRedirect, callbackURL+"?auth_error=invalid_state")
		return
	}

	// 如果没有 code_verifier，尝试使用简单模式（需要前端传递）
	if codeVerifier == "" {
		// 从 cookie 获取
		if cookie, err := c.Cookie("twitter_code_verifier"); err == nil {
			codeVerifier = cookie
		}
	}

	// 交换 code 获取 token
	tokenData, err := h.exchangeTwitterCode(code, codeVerifier)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, callbackURL+"?auth_error="+url.QueryEscape(err.Error()))
		return
	}

	// 获取用户信息
	userInfo, err := h.getTwitterUserInfo(tokenData["access_token"].(string))
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, callbackURL+"?auth_error="+url.QueryEscape(err.Error()))
		return
	}

	// 查找或创建用户
	data := userInfo["data"].(map[string]interface{})
	twitterID := data["id"].(string)
	handle := ""
	if u, ok := data["username"].(string); ok {
		handle = "@" + u
	}
	name := ""
	if n, ok := data["name"].(string); ok {
		name = n
	}
	avatar := ""
	if a, ok := data["profile_image_url"].(string); ok {
		avatar = a
	}

	user, err := h.authService.FindOrCreateByTwitter(twitterID, handle, name, avatar)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, callbackURL+"?auth_error="+url.QueryEscape(err.Error()))
		return
	}

	// 生成 JWT
	token, err := h.authService.GenerateToken(user)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, callbackURL+"?auth_error="+url.QueryEscape(err.Error()))
		return
	}

	// 重定向到前端回调页面，带上 token
	c.Redirect(http.StatusTemporaryRedirect, callbackURL+"?auth_token="+token+"&auth_provider=twitter")
}

func (h *OAuthHandler) exchangeTwitterCode(code, codeVerifier string) (map[string]interface{}, error) {
	data := url.Values{}
	data.Set("code", code)
	data.Set("grant_type", "authorization_code")
	data.Set("client_id", h.config.TwitterClientID)
	data.Set("redirect_uri", h.config.TwitterRedirectURL)
	if codeVerifier != "" {
		data.Set("code_verifier", codeVerifier)
	}

	req, _ := http.NewRequest("POST", "https://api.x.com/2/oauth2/token", strings.NewReader(data.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	// Basic auth with client credentials
	if h.config.TwitterClientSecret != "" {
		req.SetBasicAuth(h.config.TwitterClientID, h.config.TwitterClientSecret)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse token response: %v", err)
	}

	if errMsg, ok := result["error"].(string); ok {
		return nil, fmt.Errorf("token error: %s", errMsg)
	}

	return result, nil
}

func (h *OAuthHandler) getTwitterUserInfo(accessToken string) (map[string]interface{}, error) {
	req, _ := http.NewRequest("GET", "https://api.x.com/2/users/me?user.fields=profile_image_url", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse user info: %v", err)
	}

	return result, nil
}

// PKCE helpers
func (h *OAuthHandler) generateCodeVerifier() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

func (h *OAuthHandler) generateCodeChallenge(verifier string) string {
	// S256: SHA256 hash then base64url encode
	h256 := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(h256[:])
}
