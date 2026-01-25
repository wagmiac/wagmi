package handlers

import (
	"content-engine/internal/services"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthHandler 认证处理器
type AuthHandler struct {
	authService *services.AuthService
}

// NewAuthHandler 创建处理器
func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// GoogleLoginRequest Google 登录请求
type GoogleLoginRequest struct {
	GoogleID string `json:"google_id" binding:"required"`
	Email    string `json:"email" binding:"required"`
	Name     string `json:"name"`
	Avatar   string `json:"avatar"`
}

// GoogleLogin Google 登录
func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	var req GoogleLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	user, err := h.authService.FindOrCreateByGoogle(req.GoogleID, req.Email, req.Name, req.Avatar)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	token, err := h.authService.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"token": token,
			"user":  user,
		},
	})
}

// TwitterLoginRequest Twitter 登录请求
type TwitterLoginRequest struct {
	TwitterID string `json:"twitter_id" binding:"required"`
	Handle    string `json:"handle"`
	Name      string `json:"name"`
	Avatar    string `json:"avatar"`
}

// TwitterLogin Twitter 登录
func (h *AuthHandler) TwitterLogin(c *gin.Context) {
	var req TwitterLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	user, err := h.authService.FindOrCreateByTwitter(req.TwitterID, req.Handle, req.Name, req.Avatar)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	token, err := h.authService.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"token": token,
			"user":  user,
		},
	})
}

// WalletLoginRequest 钱包登录请求
type WalletLoginRequest struct {
	Address    string `json:"address" binding:"required"`
	Signature  string `json:"signature" binding:"required"`
	Message    string `json:"message" binding:"required"`
	WalletType string `json:"wallet_type"` // phantom/metamask/okx/walletconnect/coinbase
	ChainType  string `json:"chain_type"`  // evm/solana
}

// WalletLogin 钱包登录
func (h *AuthHandler) WalletLogin(c *gin.Context) {
	var req WalletLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 确定链类型
	chainType := req.ChainType
	if chainType == "" {
		// 根据钱包类型推断
		if req.WalletType == "phantom" {
			chainType = "solana"
		} else {
			chainType = "evm"
		}
	}

	// 验证签名
	valid, err := h.authService.VerifyWalletSignature(req.Address, req.Message, req.Signature, chainType)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Signature verification failed: " + err.Error()})
		return
	}
	if !valid {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Invalid signature"})
		return
	}

	user, err := h.authService.FindOrCreateByWallet(req.Address, req.WalletType, chainType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	token, err := h.authService.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"token": token,
			"user":  user,
		},
	})
}

// GetNonce 获取签名用的 nonce
func (h *AuthHandler) GetNonce(c *gin.Context) {
	address := c.Query("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "address required"})
		return
	}

	nonce := h.authService.GenerateNonce()
	message := "Sign this message to login to WAGMI.\n\nNonce: " + nonce

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"nonce":   nonce,
			"message": message,
		},
	})
}

// GetMe 获取当前用户信息
func (h *AuthHandler) GetMe(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "unauthorized"})
		return
	}

	user, err := h.authService.GetUserByID(userID.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    user,
	})
}

// UpdateProfileRequest 更新资料请求
type UpdateProfileRequest struct {
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
}

// UpdateProfile 更新用户资料
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "unauthorized"})
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	if err := h.authService.UpdateProfile(userID.(string), req.Nickname, req.Avatar); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "profile updated",
	})
}

// AuthMiddleware JWT 认证中间件
func AuthMiddleware(authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "authorization header required"})
			c.Abort()
			return
		}

		// Bearer token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "invalid authorization header"})
			c.Abort()
			return
		}

		claims, err := authService.ValidateToken(parts[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "invalid token"})
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("nickname", claims.Nickname)
		c.Next()
	}
}

// OptionalAuthMiddleware 可选认证中间件（不强制要求登录）
func OptionalAuthMiddleware(authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.Next()
			return
		}

		claims, err := authService.ValidateToken(parts[1])
		if err == nil {
			c.Set("userID", claims.UserID)
			c.Set("nickname", claims.Nickname)
		}

		c.Next()
	}
}

// AdminMiddleware 管理员中间件（必须先经过 AuthMiddleware）
func AdminMiddleware(authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "unauthorized"})
			c.Abort()
			return
		}

		user, err := authService.GetUserByID(userID.(string))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "user not found"})
			c.Abort()
			return
		}

		if !user.IsAdmin() {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "error": "admin access required"})
			c.Abort()
			return
		}

		c.Set("user", user)
		c.Next()
	}
}
