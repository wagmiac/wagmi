package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"
)

// GitHubService GitHub数据抓取服务
type GitHubService struct {
	client *http.Client
	token  string // GitHub API token (可选，用于提高rate limit)
}

// GitHubRepoData GitHub仓库数据
type GitHubRepoData struct {
	Name            string    `json:"name"`
	FullName        string    `json:"full_name"`
	Description     string    `json:"description"`
	Stars           int       `json:"stargazers_count"`
	Forks           int       `json:"forks_count"`
	Watchers        int       `json:"watchers_count"`
	OpenIssues      int       `json:"open_issues_count"`
	Language        string    `json:"language"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	PushedAt        time.Time `json:"pushed_at"`
	DefaultBranch   string    `json:"default_branch"`
	Topics          []string  `json:"topics"`
	License         *License  `json:"license"`
	ContributorsURL string    `json:"contributors_url"`
}

// License 许可证信息
type License struct {
	Key  string `json:"key"`
	Name string `json:"name"`
}

// GitHubStats GitHub统计数据（用于评估）
type GitHubStats struct {
	Stars            int      `json:"stars"`
	Forks            int      `json:"forks"`
	Watchers         int      `json:"watchers"`
	OpenIssues       int      `json:"open_issues"`
	Contributors     int      `json:"contributors"`
	Language         string   `json:"language"`
	Topics           []string `json:"topics"`
	License          string   `json:"license"`
	DaysSinceCreated int      `json:"days_since_created"`
	DaysSinceUpdated int      `json:"days_since_updated"`
	DaysSincePushed  int      `json:"days_since_pushed"`
	IsActive         bool     `json:"is_active"`     // 最近7天有推送
	StarsPerDay      float64  `json:"stars_per_day"` // 平均每天获得的Stars
	HotLevel         string   `json:"hot_level"`     // 热度等级：explosive/hot/warm/normal/cold
	HotReason        string   `json:"hot_reason"`    // 热度原因
}

// NewGitHubService 创建GitHub服务
func NewGitHubService(token string) *GitHubService {
	// 创建支持代理的 HTTP client
	transport := &http.Transport{}

	// 从环境变量读取代理设置
	proxyURL := getProxyURL()
	if proxyURL != nil {
		transport.Proxy = http.ProxyURL(proxyURL)
	}

	return &GitHubService{
		client: &http.Client{
			Timeout:   15 * time.Second,
			Transport: transport,
		},
		token: token,
	}
}

// getProxyURL 获取代理URL
func getProxyURL() *url.URL {
	// 尝试读取代理环境变量
	proxyEnvs := []string{"HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"}
	for _, env := range proxyEnvs {
		if proxyStr := os.Getenv(env); proxyStr != "" {
			if proxyURL, err := url.Parse(proxyStr); err == nil {
				return proxyURL
			}
		}
	}
	return nil
}

// ParseGitHubURL 从GitHub URL解析 owner/repo
func (s *GitHubService) ParseGitHubURL(url string) (owner, repo string, err error) {
	if url == "" {
		return "", "", fmt.Errorf("empty GitHub URL")
	}

	// 处理各种格式
	// https://github.com/owner/repo
	// github.com/owner/repo
	// owner/repo

	url = strings.TrimSpace(url)
	url = strings.TrimSuffix(url, "/")
	url = strings.TrimSuffix(url, ".git")

	// 正则匹配
	patterns := []string{
		`github\.com[/:]([^/]+)/([^/]+)`,
		`^([^/]+)/([^/]+)$`,
	}

	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindStringSubmatch(url)
		if len(matches) == 3 {
			return matches[1], matches[2], nil
		}
	}

	return "", "", fmt.Errorf("invalid GitHub URL format: %s", url)
}

// GetRepoStats 获取仓库统计数据
func (s *GitHubService) GetRepoStats(githubURL string) (*GitHubStats, error) {
	owner, repo, err := s.ParseGitHubURL(githubURL)
	if err != nil {
		return nil, err
	}

	// 获取仓库基础信息
	repoData, err := s.getRepoData(owner, repo)
	if err != nil {
		return nil, err
	}

	// 获取贡献者数量
	contributorCount := s.getContributorCount(owner, repo)

	// 计算统计数据
	now := time.Now()
	daysSinceCreated := int(now.Sub(repoData.CreatedAt).Hours() / 24)
	daysSinceUpdated := int(now.Sub(repoData.UpdatedAt).Hours() / 24)
	daysSincePushed := int(now.Sub(repoData.PushedAt).Hours() / 24)

	// 计算平均每天Stars
	starsPerDay := float64(0)
	if daysSinceCreated > 0 {
		starsPerDay = float64(repoData.Stars) / float64(daysSinceCreated)
	}

	// 判断热度等级
	hotLevel, hotReason := s.calculateHotLevel(repoData.Stars, starsPerDay, daysSinceCreated, daysSincePushed)

	// 许可证
	licenseName := ""
	if repoData.License != nil {
		licenseName = repoData.License.Name
	}

	return &GitHubStats{
		Stars:            repoData.Stars,
		Forks:            repoData.Forks,
		Watchers:         repoData.Watchers,
		OpenIssues:       repoData.OpenIssues,
		Contributors:     contributorCount,
		Language:         repoData.Language,
		Topics:           repoData.Topics,
		License:          licenseName,
		DaysSinceCreated: daysSinceCreated,
		DaysSinceUpdated: daysSinceUpdated,
		DaysSincePushed:  daysSincePushed,
		IsActive:         daysSincePushed <= 7,
		StarsPerDay:      starsPerDay,
		HotLevel:         hotLevel,
		HotReason:        hotReason,
	}, nil
}

// getRepoData 获取仓库数据
func (s *GitHubService) getRepoData(owner, repo string) (*GitHubRepoData, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s", owner, repo)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "wagmi-evaluation-bot")
	if s.token != "" {
		req.Header.Set("Authorization", "Bearer "+s.token)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("GitHub API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 404 {
		return nil, fmt.Errorf("GitHub repository not found: %s/%s", owner, repo)
	}

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error (status %d): %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var data GitHubRepoData
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, fmt.Errorf("failed to parse GitHub response: %w", err)
	}

	return &data, nil
}

// getContributorCount 获取贡献者数量
func (s *GitHubService) getContributorCount(owner, repo string) int {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/contributors?per_page=1&anon=true", owner, repo)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return 0
	}

	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "wagmi-evaluation-bot")
	if s.token != "" {
		req.Header.Set("Authorization", "Bearer "+s.token)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return 0
	}
	defer resp.Body.Close()

	// 从 Link header 获取总数
	link := resp.Header.Get("Link")
	if link != "" {
		// 解析 Link header 获取最后一页的页码
		re := regexp.MustCompile(`page=(\d+)>; rel="last"`)
		matches := re.FindStringSubmatch(link)
		if len(matches) == 2 {
			var count int
			fmt.Sscanf(matches[1], "%d", &count)
			return count
		}
	}

	// 如果没有分页，说明贡献者少于等于1
	return 1
}

// calculateHotLevel 计算热度等级
func (s *GitHubService) calculateHotLevel(stars int, starsPerDay float64, daysSinceCreated, daysSincePushed int) (level, reason string) {
	// 爆发级别 (explosive): 新项目但Stars飙升
	if daysSinceCreated <= 90 && stars >= 10000 {
		return "explosive", fmt.Sprintf("项目仅创建%d天，已获得%d Stars，日均%.1f Stars，增长极其迅猛", daysSinceCreated, stars, starsPerDay)
	}

	if starsPerDay >= 100 {
		return "explosive", fmt.Sprintf("日均获得%.0f Stars，热度正在爆发", starsPerDay)
	}

	// 热门级别 (hot): Stars高且活跃
	if stars >= 50000 && daysSincePushed <= 7 {
		return "hot", fmt.Sprintf("%d Stars，且最近%d天有更新，属于热门活跃项目", stars, daysSincePushed)
	}

	if starsPerDay >= 30 {
		return "hot", fmt.Sprintf("日均获得%.0f Stars，热度较高", starsPerDay)
	}

	if stars >= 20000 && daysSincePushed <= 30 {
		return "hot", fmt.Sprintf("%d Stars的成熟项目，保持活跃更新", stars)
	}

	// 温和级别 (warm): 有一定热度
	if stars >= 5000 && daysSincePushed <= 30 {
		return "warm", fmt.Sprintf("%d Stars，最近有更新，属于稳健型项目", stars)
	}

	if starsPerDay >= 5 {
		return "warm", fmt.Sprintf("日均获得%.1f Stars，有持续关注", starsPerDay)
	}

	// 正常级别 (normal)
	if stars >= 1000 {
		return "normal", fmt.Sprintf("%d Stars，有一定知名度", stars)
	}

	// 冷门级别 (cold)
	return "cold", fmt.Sprintf("仅%d Stars，知名度较低", stars)
}

// FormatStatsForPrompt 格式化统计数据用于AI prompt
func (s *GitHubService) FormatStatsForPrompt(stats *GitHubStats) string {
	if stats == nil {
		return "GitHub数据: 未能获取"
	}

	hotEmoji := map[string]string{
		"explosive": "🔥🔥🔥",
		"hot":       "🔥🔥",
		"warm":      "🔥",
		"normal":    "📊",
		"cold":      "❄️",
	}

	return fmt.Sprintf(`GitHub数据:
- Stars: %d %s
- Forks: %d
- Watchers: %d
- 贡献者: %d
- 开放Issues: %d
- 主要语言: %s
- 许可证: %s
- 项目创建: %d天前
- 最近推送: %d天前
- 日均Stars: %.1f
- 热度等级: %s %s
- 热度分析: %s
- 是否活跃: %v`,
		stats.Stars, hotEmoji[stats.HotLevel],
		stats.Forks,
		stats.Watchers,
		stats.Contributors,
		stats.OpenIssues,
		stats.Language,
		stats.License,
		stats.DaysSinceCreated,
		stats.DaysSincePushed,
		stats.StarsPerDay,
		stats.HotLevel, hotEmoji[stats.HotLevel],
		stats.HotReason,
		stats.IsActive,
	)
}
