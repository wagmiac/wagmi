package handlers

import (
	"content-engine/internal/models"
	"content-engine/internal/repository"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type TokenHandler struct {
	repo *repository.TokenRepository
}

func NewTokenHandler(db *gorm.DB) *TokenHandler {
	return &TokenHandler{
		repo: repository.NewTokenRepository(db),
	}
}

// GetPublishedTokens 获取已发布的代币（公开接口）
func (h *TokenHandler) GetPublishedTokens(c *gin.Context) {
	tokens, err := h.repo.GetPublished()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch tokens",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    tokens,
	})
}

// GetTokenByID 获取代币详情（公开接口，仅已发布）
// 只允许通过 Symbol (tick) 查询，不允许通过 UUID 查询
func (h *TokenHandler) GetTokenByID(c *gin.Context) {
	symbol := c.Param("id")

	// 只通过 Symbol 查询，不支持 UUID
	token, err := h.repo.GetBySymbol(symbol)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch token",
		})
		return
	}

	if token == nil || token.Status != "published" {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Token not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    token,
	})
}

// AdminGetAllTokens 管理员获取所有代币
func (h *TokenHandler) AdminGetAllTokens(c *gin.Context) {
	tokens, err := h.repo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch tokens",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    tokens,
	})
}

// AdminGetTokenByID 管理员获取代币详情（包括未发布）
func (h *TokenHandler) AdminGetTokenByID(c *gin.Context) {
	id := c.Param("id")

	token, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch token",
		})
		return
	}

	if token == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Token not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    token,
	})
}

// CreateToken 创建代币
func (h *TokenHandler) CreateToken(c *gin.Context) {
	var req struct {
		Name        string  `json:"name" binding:"required"`
		Symbol      string  `json:"symbol" binding:"required"`
		Logo        string  `json:"logo" binding:"required"`
		Description string  `json:"description" binding:"required"`
		Website     *string `json:"website"`
		Twitter     *string `json:"twitter"`
		Telegram    *string `json:"telegram"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Missing required fields",
		})
		return
	}

	// 检查 Symbol 是否重复
	exists, err := h.repo.CheckSymbolDuplicate(req.Symbol, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to check symbol",
		})
		return
	}
	if exists {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Symbol already exists",
		})
		return
	}

	token := &models.Token{
		Name:        req.Name,
		Symbol:      req.Symbol,
		Logo:        req.Logo,
		Description: req.Description,
		Website:     req.Website,
		Twitter:     req.Twitter,
		Telegram:    req.Telegram,
		Chain:       "",
		Status:      "draft",
	}

	if err := h.repo.Create(token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create token",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    token,
	})
}

// UpdateToken 更新代币
func (h *TokenHandler) UpdateToken(c *gin.Context) {
	id := c.Param("id")

	token, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch token",
		})
		return
	}

	if token == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Token not found",
		})
		return
	}

	var req struct {
		Name            *string `json:"name"`
		Symbol          *string `json:"symbol"`
		Logo            *string `json:"logo"`
		Description     *string `json:"description"`
		Website         *string `json:"website"`
		Twitter         *string `json:"twitter"`
		Telegram        *string `json:"telegram"`
		ContractAddress *string `json:"contract_address"`
		Chain           *string `json:"chain"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request",
		})
		return
	}

	// 更新字段
	if req.Name != nil {
		token.Name = *req.Name
	}
	if req.Symbol != nil {
		token.Symbol = *req.Symbol
	}
	if req.Logo != nil {
		token.Logo = *req.Logo
	}
	if req.Description != nil {
		token.Description = *req.Description
	}
	if req.Website != nil {
		token.Website = req.Website
	}
	if req.Twitter != nil {
		token.Twitter = req.Twitter
	}
	if req.Telegram != nil {
		token.Telegram = req.Telegram
	}
	if req.ContractAddress != nil {
		token.ContractAddress = req.ContractAddress
	}
	if req.Chain != nil {
		token.Chain = *req.Chain
	}

	if err := h.repo.Update(token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update token",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    token,
	})
}

// PublishToken 发布代币
func (h *TokenHandler) PublishToken(c *gin.Context) {
	id := c.Param("id")

	token, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch token",
		})
		return
	}

	if token == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Token not found",
		})
		return
	}

	var req struct {
		ContractAddress string `json:"contract_address" binding:"required"`
		Chain           string `json:"chain" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Missing contract address or chain",
		})
		return
	}

	// 检查合约地址是否重复
	isDuplicate, err := h.repo.CheckDuplicate(req.ContractAddress, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to check duplicate",
		})
		return
	}

	if isDuplicate {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Contract address already exists",
		})
		return
	}

	// 更新代币
	now := time.Now()
	token.ContractAddress = &req.ContractAddress
	token.Chain = req.Chain
	token.Status = "published"
	token.PublishedAt = &now

	if err := h.repo.Update(token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to publish token",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    token,
		"message": "Token published successfully",
	})
}

// DeleteToken 删除代币
func (h *TokenHandler) DeleteToken(c *gin.Context) {
	id := c.Param("id")

	token, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch token",
		})
		return
	}

	if token == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Token not found",
		})
		return
	}

	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to delete token",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Token deleted successfully",
	})
}

// UploadTokenLogo 上传代币图标
func (h *TokenHandler) UploadTokenLogo(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "No file uploaded",
		})
		return
	}

	// 验证文件类型
	allowedTypes := map[string]bool{
		".png":  true,
		".jpg":  true,
		".jpeg": true,
		".gif":  true,
		".webp": true,
	}
	ext := filepath.Ext(file.Filename)
	if !allowedTypes[ext] {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid file type. Only PNG, JPG, GIF, and WebP are allowed.",
		})
		return
	}

	// 验证文件大小 (5MB)
	if file.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "File size exceeds 5MB limit",
		})
		return
	}

	// 生成唯一文件名
	filename := fmt.Sprintf("token_%d%s", time.Now().UnixNano(), ext)

	// 确保上传目录存在
	uploadDir := "./uploads/tokens"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create upload directory",
		})
		return
	}

	// 保存文件
	filePath := filepath.Join(uploadDir, filename)
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to save file",
		})
		return
	}

	// 返回 URL（通过静态文件服务访问）
	url := fmt.Sprintf("/uploads/tokens/%s", filename)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"url":      url,
			"filename": filename,
		},
	})
}
