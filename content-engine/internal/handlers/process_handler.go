package handlers

import (
	"content-engine/internal/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type ProcessHandler struct {
	service *services.ContentService
}

func NewProcessHandler(service *services.ContentService) *ProcessHandler {
	return &ProcessHandler{service: service}
}

// ProcessRequest 加工请求
type ProcessRequest struct {
	GenerateZh bool `json:"generate_zh"`
	GenerateEn bool `json:"generate_en"`
}

// Process AI 加工单条内容
func (h *ProcessHandler) Process(c *gin.Context) {
	id := c.Param("id")

	var req ProcessRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// 默认生成双语
		req.GenerateZh = true
		req.GenerateEn = true
	}

	// 至少生成一种语言
	if !req.GenerateZh && !req.GenerateEn {
		req.GenerateZh = true
		req.GenerateEn = true
	}

	if err := h.service.Process(id, req.GenerateZh, req.GenerateEn); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 返回更新后的内容
	content, _ := h.service.Get(id)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": content, "message": "Processed successfully"})
}

// BatchProcessRequest 批量加工请求
type BatchProcessRequest struct {
	IDs        []string `json:"ids" binding:"required"`
	GenerateZh bool     `json:"generate_zh"`
	GenerateEn bool     `json:"generate_en"`
}

// BatchProcess 批量 AI 加工
func (h *ProcessHandler) BatchProcess(c *gin.Context) {
	var req BatchProcessRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 默认生成双语
	if !req.GenerateZh && !req.GenerateEn {
		req.GenerateZh = true
		req.GenerateEn = true
	}

	var succeeded []string
	var failed []string

	for _, id := range req.IDs {
		if err := h.service.Process(id, req.GenerateZh, req.GenerateEn); err != nil {
			failed = append(failed, id)
		} else {
			succeeded = append(succeeded, id)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"succeeded": succeeded,
		"failed":    failed,
		"message":   "Batch process completed",
	})
}
