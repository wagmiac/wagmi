package utils

import (
	"fmt"
	"regexp"
	"strings"
	"unicode"

	"github.com/mozillazg/go-pinyin"
)

// GenerateSlug 根据标题生成 URL 友好的 slug
// 支持中英文混合，中文会转换为拼音
func GenerateSlug(title string, maxLength int) string {
	if title == "" {
		return ""
	}

	// 设置默认最大长度
	if maxLength <= 0 {
		maxLength = 100
	}

	// 转小写
	title = strings.ToLower(title)

	// 检查是否包含中文
	hasChinese := false
	for _, r := range title {
		if unicode.Is(unicode.Han, r) {
			hasChinese = true
			break
		}
	}

	var slug string
	if hasChinese {
		// 中文转拼音
		args := pinyin.NewArgs()
		args.Separator = "-"
		slug = pinyin.Slug(title, args)
	} else {
		slug = title
	}

	// 替换特殊字符为连字符
	reg := regexp.MustCompile(`[^a-z0-9]+`)
	slug = reg.ReplaceAllString(slug, "-")

	// 去除首尾连字符
	slug = strings.Trim(slug, "-")

	// 合并多个连字符
	reg = regexp.MustCompile(`-+`)
	slug = reg.ReplaceAllString(slug, "-")

	// 截断长度
	if len(slug) > maxLength {
		// 在单词边界截断
		slug = slug[:maxLength]
		if lastDash := strings.LastIndex(slug, "-"); lastDash > maxLength/2 {
			slug = slug[:lastDash]
		}
	}

	return slug
}

// GenerateUniqueSlug 生成唯一的 slug，如果重复则添加数字后缀
func GenerateUniqueSlug(title string, existingCheck func(slug string) bool) string {
	baseSlug := GenerateSlug(title, 80)
	if baseSlug == "" {
		baseSlug = "insight"
	}

	slug := baseSlug
	counter := 1

	// 检查是否存在，如果存在则添加数字后缀
	for existingCheck(slug) {
		counter++
		slug = fmt.Sprintf("%s-%d", baseSlug, counter)
	}

	return slug
}
