package handlers

import (
	"bytes"
	"content-engine/internal/config"
	"content-engine/internal/models"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect test database: %v", err)
	}

	// 迁移表
	db.AutoMigrate(
		&models.Project{},
		&models.Bid{},
		&models.TimelineEvent{},
		&models.IMOUser{},
		&models.RevenueRecord{},
		&models.ClaimRequest{},
	)

	return db
}

func setupTestRouter(db *gorm.DB) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	imoHandler := NewIMOHandler(db)

	api := r.Group("/api/imo")
	{
		api.GET("/projects", imoHandler.ListProjects)
		api.GET("/projects/ticker/:ticker", imoHandler.GetProject)
		api.GET("/projects/:id", imoHandler.GetProjectByID)
		api.POST("/projects", imoHandler.CreateProject)
		api.GET("/projects/:id/bids", imoHandler.GetBids)
		api.GET("/projects/:id/timeline", imoHandler.GetTimeline)
		api.GET("/stats", imoHandler.GetStats)
		api.GET("/wallet/nonce", imoHandler.GetWalletNonce)
		api.POST("/wallet/verify", imoHandler.VerifyWallet)
	}

	return r
}

func TestListProjects(t *testing.T) {
	db := setupTestDB(t)
	router := setupTestRouter(db)

	// 创建测试项目
	project := models.Project{
		Name:   "Test Project",
		Ticker: "TEST",
		Chain:  models.ChainSolana,
		Status: models.ProjectStatusDiscovering,
	}
	db.Create(&project)

	// 发送请求
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/imo/projects", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.True(t, response["success"].(bool))

	data := response["data"].([]interface{})
	assert.Equal(t, 1, len(data))
}

func TestListProjectsWithStatusFilter(t *testing.T) {
	db := setupTestDB(t)
	router := setupTestRouter(db)

	// 创建多个状态的项目
	db.Create(&models.Project{Name: "P1", Ticker: "P1", Chain: models.ChainSolana, Status: models.ProjectStatusDiscovering})
	db.Create(&models.Project{Name: "P2", Ticker: "P2", Chain: models.ChainSolana, Status: models.ProjectStatusAuctioning})
	db.Create(&models.Project{Name: "P3", Ticker: "P3", Chain: models.ChainBSC, Status: models.ProjectStatusLaunched})

	// 测试状态筛选
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/imo/projects?status=discovering", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	data := response["data"].([]interface{})
	assert.Equal(t, 1, len(data))
}

func TestGetProjectByTicker(t *testing.T) {
	db := setupTestDB(t)
	router := setupTestRouter(db)

	project := models.Project{
		Name:   "Cursor AI",
		Ticker: "CURSOR",
		Chain:  models.ChainSolana,
		Status: models.ProjectStatusAuctioning,
	}
	db.Create(&project)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/imo/projects/ticker/CURSOR", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.True(t, response["success"].(bool))

	data := response["data"].(map[string]interface{})
	assert.Equal(t, "CURSOR", data["ticker"])
}

func TestGetProjectNotFound(t *testing.T) {
	db := setupTestDB(t)
	router := setupTestRouter(db)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/imo/projects/ticker/NOTEXIST", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestGetStats(t *testing.T) {
	db := setupTestDB(t)
	router := setupTestRouter(db)

	// 创建测试数据
	db.Create(&models.Project{Name: "P1", Ticker: "P1", Chain: models.ChainSolana, Status: models.ProjectStatusDiscovering})
	db.Create(&models.Project{Name: "P2", Ticker: "P2", Chain: models.ChainSolana, Status: models.ProjectStatusAuctioning})
	db.Create(&models.IMOUser{Wallet: "wallet1", Chain: models.ChainSolana})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/imo/stats", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.True(t, response["success"].(bool))

	data := response["data"].(map[string]interface{})
	assert.Equal(t, float64(2), data["totalProjects"])
	assert.Equal(t, float64(1), data["discoveringCount"])
	assert.Equal(t, float64(1), data["auctioningCount"])
	assert.Equal(t, float64(1), data["totalUsers"])
}

func TestGetWalletNonce(t *testing.T) {
	db := setupTestDB(t)
	router := setupTestRouter(db)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/imo/wallet/nonce?wallet=7xKXtg123456", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.True(t, response["success"].(bool))

	data := response["data"].(map[string]interface{})
	assert.NotEmpty(t, data["nonce"])
	assert.NotEmpty(t, data["message"])
}

func TestGetWalletNonceMissingWallet(t *testing.T) {
	db := setupTestDB(t)
	router := setupTestRouter(db)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/imo/wallet/nonce", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestVerifyWallet(t *testing.T) {
	db := setupTestDB(t)
	router := setupTestRouter(db)

	wallet := "7xKXtg123456"

	// 先获取 nonce
	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest("GET", "/api/imo/wallet/nonce?wallet="+wallet, nil)
	router.ServeHTTP(w1, req1)

	// 验证钱包
	body := map[string]string{
		"wallet":    wallet,
		"signature": "mock_signature",
		"chain":     "solana",
	}
	bodyBytes, _ := json.Marshal(body)

	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("POST", "/api/imo/wallet/verify", bytes.NewBuffer(bodyBytes))
	req2.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w2, req2)

	assert.Equal(t, http.StatusOK, w2.Code)

	var response map[string]interface{}
	json.Unmarshal(w2.Body.Bytes(), &response)
	assert.True(t, response["success"].(bool))

	// 检查用户是否创建
	var user models.IMOUser
	db.Where("wallet = ?", wallet).First(&user)
	assert.Equal(t, wallet, user.Wallet)
}

func TestGetProjectTimeline(t *testing.T) {
	db := setupTestDB(t)
	router := setupTestRouter(db)

	// 创建项目
	project := models.Project{
		Name:   "Test",
		Ticker: "TEST",
		Chain:  models.ChainSolana,
		Status: models.ProjectStatusAuctioning,
	}
	db.Create(&project)

	// 创建时间线事件
	db.Create(&models.TimelineEvent{
		ProjectID: project.ID,
		Type:      models.TimelineEventDiscovered,
		Actor:     "wallet1",
	})
	db.Create(&models.TimelineEvent{
		ProjectID: project.ID,
		Type:      models.TimelineEventBid,
		Actor:     "wallet2",
		Data:      models.JSONMap{"amount": 0.5},
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/imo/projects/"+project.ID+"/timeline", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.True(t, response["success"].(bool))

	data := response["data"].([]interface{})
	assert.Equal(t, 2, len(data))
}

func TestGetProjectBids(t *testing.T) {
	db := setupTestDB(t)
	router := setupTestRouter(db)

	// 创建项目
	project := models.Project{
		Name:   "Test",
		Ticker: "TEST",
		Chain:  models.ChainSolana,
		Status: models.ProjectStatusAuctioning,
	}
	db.Create(&project)

	// 创建出价
	db.Create(&models.Bid{
		ProjectID: project.ID,
		Bidder:    "wallet1",
		Amount:    0.5,
		Currency:  "SOL",
	})
	db.Create(&models.Bid{
		ProjectID: project.ID,
		Bidder:    "wallet2",
		Amount:    0.8,
		Currency:  "SOL",
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/imo/projects/"+project.ID+"/bids", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.True(t, response["success"].(bool))

	data := response["data"].([]interface{})
	assert.Equal(t, 2, len(data))
}

// 辅助函数：创建测试配置
func testConfig() *config.Config {
	return &config.Config{
		WalletEncryptionKey: "test-encryption-key-32bytes-long",
		PlatformWallet:      "platform-wallet-address",
	}
}
