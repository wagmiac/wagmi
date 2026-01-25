package repository

import (
	"content-engine/internal/models"

	"gorm.io/gorm"
)

type ContentRepository struct {
	db *gorm.DB
}

func NewContentRepository(db *gorm.DB) *ContentRepository {
	return &ContentRepository{db: db}
}

// ListParams 列表查询参数
type ListParams struct {
	Status string
	Page   int
	Limit  int
	Search string
}

// ListResult 列表返回结果
type ListResult struct {
	Items []models.Content `json:"items"`
	Total int64            `json:"total"`
	Page  int              `json:"page"`
	Limit int              `json:"limit"`
}

// List 获取内容列表
func (r *ContentRepository) List(params ListParams) (*ListResult, error) {
	var contents []models.Content
	var total int64

	query := r.db.Model(&models.Content{})

	// 状态筛选
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}

	// 搜索
	if params.Search != "" {
		search := "%" + params.Search + "%"
		query = query.Where("raw_content ILIKE ? OR content_zh ILIKE ? OR content_en ILIKE ? OR author ILIKE ?",
			search, search, search, search)
	}

	// 统计总数
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// 分页
	if params.Page <= 0 {
		params.Page = 1
	}
	if params.Limit <= 0 {
		params.Limit = 10
	}
	offset := (params.Page - 1) * params.Limit

	// 查询
	if err := query.Order("created_at DESC").Offset(offset).Limit(params.Limit).Find(&contents).Error; err != nil {
		return nil, err
	}

	return &ListResult{
		Items: contents,
		Total: total,
		Page:  params.Page,
		Limit: params.Limit,
	}, nil
}

// GetByID 根据 ID 获取内容
func (r *ContentRepository) GetByID(id string) (*models.Content, error) {
	var content models.Content
	if err := r.db.First(&content, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &content, nil
}

// GetBySlug 根据 slug 获取内容
func (r *ContentRepository) GetBySlug(slug string) (*models.Content, error) {
	var content models.Content
	if err := r.db.First(&content, "slug = ?", slug).Error; err != nil {
		return nil, err
	}
	return &content, nil
}

// Create 创建内容
func (r *ContentRepository) Create(content *models.Content) error {
	return r.db.Create(content).Error
}

// Update 更新内容
func (r *ContentRepository) Update(content *models.Content) error {
	return r.db.Save(content).Error
}

// Delete 删除内容（同时删除关联数据）
func (r *ContentRepository) Delete(id string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// 删除关联的浏览历史
		if err := tx.Exec("DELETE FROM view_histories WHERE content_id = ?", id).Error; err != nil {
			return err
		}
		// 删除关联的评论
		if err := tx.Exec("DELETE FROM comments WHERE content_id = ?", id).Error; err != nil {
			return err
		}
		// 删除关联的收藏
		if err := tx.Exec("DELETE FROM favorites WHERE content_id = ?", id).Error; err != nil {
			return err
		}
		// 删除内容本身
		if err := tx.Delete(&models.Content{}, "id = ?", id).Error; err != nil {
			return err
		}
		return nil
	})
}

// UpdateStatus 更新状态
func (r *ContentRepository) UpdateStatus(id string, status string) error {
	return r.db.Model(&models.Content{}).Where("id = ?", id).Update("status", status).Error
}

// Stats 统计数据
type Stats struct {
	Total     int64 `json:"total"`
	Raw       int64 `json:"raw"`
	Pending   int64 `json:"pending"`
	Approved  int64 `json:"approved"`
	Published int64 `json:"published"`
	Rejected  int64 `json:"rejected"`
}

// GetStats 获取统计数据
func (r *ContentRepository) GetStats() (*Stats, error) {
	var stats Stats

	r.db.Model(&models.Content{}).Count(&stats.Total)
	r.db.Model(&models.Content{}).Where("status = ?", "raw").Count(&stats.Raw)
	r.db.Model(&models.Content{}).Where("status = ?", "pending").Count(&stats.Pending)
	r.db.Model(&models.Content{}).Where("status = ?", "approved").Count(&stats.Approved)
	r.db.Model(&models.Content{}).Where("status = ?", "published").Count(&stats.Published)
	r.db.Model(&models.Content{}).Where("status = ?", "rejected").Count(&stats.Rejected)

	return &stats, nil
}

// ListPublished 获取已发布的内容（公开 API）
func (r *ContentRepository) ListPublished(page, limit int, lang, search, tag string) (*ListResult, error) {
	var contents []models.Content
	var total int64

	query := r.db.Model(&models.Content{}).Where("status = ?", "published")

	// 搜索
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("content_zh ILIKE ? OR content_en ILIKE ? OR core_idea ILIKE ? OR author ILIKE ?",
			searchPattern, searchPattern, searchPattern, searchPattern)
	}

	// 标签筛选 (PostgreSQL JSONB 数组包含查询)
	if tag != "" {
		query = query.Where("tags @> ?", `["`+tag+`"]`)
	}

	// 统计总数
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// 分页
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}
	offset := (page - 1) * limit

	// 查询
	if err := query.Order("published_at DESC").Offset(offset).Limit(limit).Find(&contents).Error; err != nil {
		return nil, err
	}

	return &ListResult{
		Items: contents,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}

// GetRelated 获取相关内容（基于标签匹配）
func (r *ContentRepository) GetRelated(id string, limit int) ([]models.Content, error) {
	// 先获取当前内容的标签
	var current models.Content
	if err := r.db.First(&current, "id = ?", id).Error; err != nil {
		return nil, err
	}

	if limit <= 0 {
		limit = 6
	}

	var related []models.Content

	// 如果有标签，按标签相似度查找
	if len(current.Tags) > 0 {
		// 查找有相同标签的内容，排除当前内容
		if err := r.db.Where("id != ? AND status = ?", id, "published").
			Where("tags && ?", current.Tags). // PostgreSQL 数组重叠操作符
			Order("published_at DESC").
			Limit(limit).
			Find(&related).Error; err != nil {
			// 如果标签查询失败，回退到最新内容
			r.db.Where("id != ? AND status = ?", id, "published").
				Order("published_at DESC").
				Limit(limit).
				Find(&related)
		}
	} else {
		// 没有标签，返回最新内容
		r.db.Where("id != ? AND status = ?", id, "published").
			Order("published_at DESC").
			Limit(limit).
			Find(&related)
	}

	return related, nil
}
