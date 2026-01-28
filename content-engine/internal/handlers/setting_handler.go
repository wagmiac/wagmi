package handlers

import (
	"content-engine/internal/repository"
	"net/http"

	"github.com/gin-gonic/gin"
)

type SettingHandler struct {
	repo *repository.SettingRepository
}

func NewSettingHandler(repo *repository.SettingRepository) *SettingHandler {
	return &SettingHandler{repo: repo}
}

// List 获取所有配置
func (h *SettingHandler) List(c *gin.Context) {
	settings, err := h.repo.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": settings})
}

// UpdateSettingRequest 更新配置请求
type UpdateSettingRequest struct {
	Value       string `json:"value" binding:"required"`
	Description string `json:"description"`
}

// Update 更新配置
func (h *SettingHandler) Update(c *gin.Context) {
	key := c.Param("key")

	var req UpdateSettingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	if err := h.repo.Upsert(key, req.Value, req.Description); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Updated successfully"})
}
