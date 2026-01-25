package repository

import (
	"content-engine/internal/models"
	"errors"

	"gorm.io/gorm"
)

type TokenRepository struct {
	db *gorm.DB
}

func NewTokenRepository(db *gorm.DB) *TokenRepository {
	return &TokenRepository{db: db}
}

// Create 创建代币
func (r *TokenRepository) Create(token *models.Token) error {
	return r.db.Create(token).Error
}

// GetByID 根据ID获取代币
func (r *TokenRepository) GetByID(id string) (*models.Token, error) {
	var token models.Token
	err := r.db.Where("id = ?", id).First(&token).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &token, nil
}

// GetAll 获取所有代币（管理员）
func (r *TokenRepository) GetAll() ([]models.Token, error) {
	var tokens []models.Token
	err := r.db.Order("created_at DESC").Find(&tokens).Error
	return tokens, err
}

// GetPublished 获取已发布的代币
func (r *TokenRepository) GetPublished() ([]models.Token, error) {
	var tokens []models.Token
	err := r.db.Where("status = ?", "published").
		Order("published_at DESC").
		Find(&tokens).Error
	return tokens, err
}

// Update 更新代币
func (r *TokenRepository) Update(token *models.Token) error {
	return r.db.Save(token).Error
}

// Delete 删除代币
func (r *TokenRepository) Delete(id string) error {
	return r.db.Where("id = ?", id).Delete(&models.Token{}).Error
}

// GetBySymbol 根据 Symbol 获取代币
func (r *TokenRepository) GetBySymbol(symbol string) (*models.Token, error) {
	var token models.Token
	err := r.db.Where("LOWER(symbol) = LOWER(?)", symbol).First(&token).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &token, nil
}

// CheckSymbolDuplicate 检查 Symbol 是否重复
func (r *TokenRepository) CheckSymbolDuplicate(symbol string, excludeID string) (bool, error) {
	var count int64
	query := r.db.Model(&models.Token{}).Where("LOWER(symbol) = LOWER(?)", symbol)
	if excludeID != "" {
		query = query.Where("id != ?", excludeID)
	}
	err := query.Count(&count).Error
	return count > 0, err
}

// CheckDuplicate 检查合约地址是否重复
func (r *TokenRepository) CheckDuplicate(contractAddress string, excludeID string) (bool, error) {
	var count int64
	query := r.db.Model(&models.Token{}).Where("contract_address = ?", contractAddress)
	if excludeID != "" {
		query = query.Where("id != ?", excludeID)
	}
	err := query.Count(&count).Error
	return count > 0, err
}
