package main

import (
	"content-engine/internal/config"
	"content-engine/internal/models"
	"content-engine/internal/utils"
	"log"
)

func main() {
	// 加载配置
	cfg := config.Load()

	// 连接数据库
	db, err := models.InitDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect database: %v", err)
	}

	// 获取所有没有 slug 的内容
	var contents []models.Content
	if err := db.Where("slug = '' OR slug IS NULL").Find(&contents).Error; err != nil {
		log.Fatalf("Failed to query contents: %v", err)
	}

	log.Printf("Found %d contents without slug", len(contents))

	// 为每条内容生成 slug
	updated := 0
	for _, content := range contents {
		// 优先使用英文标题
		slugText := content.CoreIdeaEn
		if slugText == "" {
			slugText = content.CoreIdeaZh
		}
		if slugText == "" {
			slugText = content.CoreIdea
		}
		if slugText == "" {
			continue // 跳过没有标题的内容
		}

		// 生成唯一 slug
		slug := utils.GenerateUniqueSlug(slugText, func(s string) bool {
			var count int64
			db.Model(&models.Content{}).Where("slug = ? AND id != ?", s, content.ID).Count(&count)
			return count > 0
		})

		// 更新
		if err := db.Model(&content).Update("slug", slug).Error; err != nil {
			log.Printf("Failed to update content %s: %v", content.ID, err)
			continue
		}

		updated++
		log.Printf("Updated: %s -> %s", content.ID[:8], slug)
	}

	log.Printf("✅ Migration complete! Updated %d/%d contents", updated, len(contents))
}
