package repository

import (
	"content-engine/internal/models"

	"gorm.io/gorm"
)

type SettingRepository struct {
	db *gorm.DB
}

func NewSettingRepository(db *gorm.DB) *SettingRepository {
	return &SettingRepository{db: db}
}

// List 获取所有配置
func (r *SettingRepository) List() ([]models.Setting, error) {
	var settings []models.Setting
	if err := r.db.Find(&settings).Error; err != nil {
		return nil, err
	}
	return settings, nil
}

// Get 获取单个配置
func (r *SettingRepository) Get(key string) (*models.Setting, error) {
	var setting models.Setting
	if err := r.db.First(&setting, "key = ?", key).Error; err != nil {
		return nil, err
	}
	return &setting, nil
}

// Update 更新配置
func (r *SettingRepository) Update(key, value string) error {
	return r.db.Model(&models.Setting{}).Where("key = ?", key).Update("value", value).Error
}

// GetValue 获取配置值
func (r *SettingRepository) GetValue(key string) string {
	setting, err := r.Get(key)
	if err != nil {
		return ""
	}
	return setting.Value
}
