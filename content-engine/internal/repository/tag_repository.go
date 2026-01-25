package repository

import (
	"content-engine/internal/models"

	"gorm.io/gorm"
)

type TagRepository struct {
	db *gorm.DB
}

func NewTagRepository(db *gorm.DB) *TagRepository {
	return &TagRepository{db: db}
}

// List 获取所有标签
func (r *TagRepository) List() ([]models.Tag, error) {
	var tags []models.Tag
	if err := r.db.Order("id ASC").Find(&tags).Error; err != nil {
		return nil, err
	}
	return tags, nil
}

// Create 创建标签
func (r *TagRepository) Create(tag *models.Tag) error {
	return r.db.Create(tag).Error
}

// Delete 删除标签
func (r *TagRepository) Delete(id uint) error {
	return r.db.Delete(&models.Tag{}, id).Error
}

// GetByName 根据名称获取标签
func (r *TagRepository) GetByName(name string) (*models.Tag, error) {
	var tag models.Tag
	if err := r.db.First(&tag, "name = ?", name).Error; err != nil {
		return nil, err
	}
	return &tag, nil
}
