package services

import (
	"content-engine/internal/models"
	"content-engine/internal/repository"
	"time"
)

type ContentService struct {
	repo      *repository.ContentRepository
	aiService *AIService
}

func NewContentService(repo *repository.ContentRepository, aiService *AIService) *ContentService {
	return &ContentService{
		repo:      repo,
		aiService: aiService,
	}
}

// List 获取内容列表
func (s *ContentService) List(params repository.ListParams) (*repository.ListResult, error) {
	return s.repo.List(params)
}

// Get 获取单条内容
func (s *ContentService) Get(id string) (*models.Content, error) {
	return s.repo.GetByID(id)
}

// GetBySlug 通过 slug 获取单条内容
func (s *ContentService) GetBySlug(slug string) (*models.Content, error) {
	return s.repo.GetBySlug(slug)
}

// Create 创建内容
func (s *ContentService) Create(content *models.Content) error {
	content.Status = "raw"
	return s.repo.Create(content)
}

// Update 更新内容
func (s *ContentService) Update(id string, updates map[string]interface{}) error {
	content, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}

	// 更新字段
	if v, ok := updates["content_zh"].(string); ok {
		content.ContentZh = v
	}
	if v, ok := updates["content_en"].(string); ok {
		content.ContentEn = v
	}
	if v, ok := updates["tags"].([]string); ok {
		content.Tags = v
	}
	if v, ok := updates["revenue"].(string); ok {
		content.Revenue = v
	}

	return s.repo.Update(content)
}

// Delete 删除内容
func (s *ContentService) Delete(id string) error {
	return s.repo.Delete(id)
}

// Process AI 加工内容
func (s *ContentService) Process(id string, generateZh, generateEn bool) error {
	content, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}

	// 更新状态为处理中
	content.Status = "processing"
	if err := s.repo.Update(content); err != nil {
		return err
	}

	// 调用 AI 服务
	result, err := s.aiService.Process(content.RawContent, generateZh, generateEn)
	if err != nil {
		// 处理失败，恢复状态
		content.Status = "raw"
		s.repo.Update(content)
		return err
	}

	// 更新内容
	if generateZh && result.ContentZh != "" {
		content.ContentZh = result.ContentZh
	}
	if generateEn && result.ContentEn != "" {
		content.ContentEn = result.ContentEn
	}

	now := time.Now()
	content.ProcessedAt = &now
	content.Status = "pending"

	return s.repo.Update(content)
}

// Approve 审核通过
func (s *ContentService) Approve(id string) error {
	content, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}

	content.Status = "approved"
	return s.repo.Update(content)
}

// Reject 审核拒绝
func (s *ContentService) Reject(id string) error {
	content, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}

	content.Status = "rejected"
	return s.repo.Update(content)
}

// Publish 发布内容
func (s *ContentService) Publish(id string) error {
	content, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}

	now := time.Now()
	content.PublishedAt = &now
	content.Status = "published"

	return s.repo.Update(content)
}

// GetStats 获取统计数据
func (s *ContentService) GetStats() (*repository.Stats, error) {
	return s.repo.GetStats()
}

// ListPublished 获取已发布内容（公开 API）
func (s *ContentService) ListPublished(page, limit int, lang, search, tag string) (*repository.ListResult, error) {
	return s.repo.ListPublished(page, limit, lang, search, tag)
}

// GetRelated 获取相关内容推荐
func (s *ContentService) GetRelated(id string, limit int) ([]models.Content, error) {
	return s.repo.GetRelated(id, limit)
}
