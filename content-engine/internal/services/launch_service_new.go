package services

import (
	"bytes"
	"content-engine/internal/models"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"
)

// ========== 新的发射流程服务 ==========

// PaymentWalletInfo 支付钱包信息
type PaymentWalletInfo struct {
	Address      string `json:"address"`
	EncryptedKey string `json:"-"` // 加密后的私钥
}

// GeneratePaymentWallet 生成支付钱包（用于接收用户付款）
func (s *LaunchService) GeneratePaymentWallet(chain models.Chain) (*PaymentWalletInfo, error) {
	var wallet *DevWalletInfo
	var err error

	switch chain {
	case models.ChainSolana:
		wallet, err = s.generateSolanaWallet()
	case models.ChainBSC:
		wallet, err = s.generateEVMWallet()
	default:
		return nil, errors.New("unsupported chain")
	}

	if err != nil {
		return nil, err
	}

	// 加密私钥
	encryptedKey, err := s.encryptPrivateKey(wallet.PrivateKey)
	if err != nil {
		return nil, err
	}

	return &PaymentWalletInfo{
		Address:      wallet.Address,
		EncryptedKey: encryptedKey,
	}, nil
}

// CheckWalletBalance 检查钱包余额
func (s *LaunchService) CheckWalletBalance(address string, chain models.Chain) (float64, string, error) {
	switch chain {
	case models.ChainSolana:
		return s.checkSolanaBalance(address)
	case models.ChainBSC:
		return s.checkBSCBalance(address)
	default:
		return 0, "", errors.New("unsupported chain")
	}
}

// checkSolanaBalance 检查 Solana 余额
func (s *LaunchService) checkSolanaBalance(address string) (float64, string, error) {
	log.Printf("Checking Solana balance for address: %s", address)

	// 调用 launch-service 的余额查询接口
	launchServiceURL := s.cfg.LaunchServiceURL
	if launchServiceURL == "" {
		launchServiceURL = "http://localhost:3001"
	}

	// 简单的 HTTP GET 请求（不需要签名）
	resp, err := http.Get(launchServiceURL + "/api/balance/solana/" + address)
	if err != nil {
		return 0, "", fmt.Errorf("failed to check balance: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, "", fmt.Errorf("failed to read response: %w", err)
	}

	var result struct {
		Success bool    `json:"success"`
		Balance float64 `json:"balance"`
		Error   string  `json:"error"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return 0, "", fmt.Errorf("failed to parse response: %w", err)
	}

	if !result.Success {
		return 0, "", fmt.Errorf("balance check failed: %s", result.Error)
	}

	return result.Balance, "", nil
}

// checkBSCBalance 检查 BSC 余额
func (s *LaunchService) checkBSCBalance(address string) (float64, string, error) {
	log.Printf("Checking BSC balance for address: %s", address)

	launchServiceURL := s.cfg.LaunchServiceURL
	if launchServiceURL == "" {
		launchServiceURL = "http://localhost:3001"
	}

	resp, err := http.Get(launchServiceURL + "/api/balance/bsc/" + address)
	if err != nil {
		return 0, "", fmt.Errorf("failed to check balance: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, "", fmt.Errorf("failed to read response: %w", err)
	}

	var result struct {
		Success bool    `json:"success"`
		Balance float64 `json:"balance"`
		Error   string  `json:"error"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return 0, "", fmt.Errorf("failed to parse response: %w", err)
	}

	if !result.Success {
		return 0, "", fmt.Errorf("balance check failed: %s", result.Error)
	}

	return result.Balance, "", nil
}

// LaunchOrderResult 发射订单结果
type LaunchOrderResult struct {
	TokenAddress    string  `json:"tokenAddress"`
	LaunchTxHash    string  `json:"launchTxHash"`
	TokenTransferTx string  `json:"tokenTransferTx"`
	TokensReceived  float64 `json:"tokensReceived"`
}

// ExecuteLaunchOrder 执行发射订单
func (s *LaunchService) ExecuteLaunchOrder(order *models.LaunchOrder, project *models.Project) (*LaunchOrderResult, error) {
	// 解密支付钱包私钥
	privateKey, err := s.decryptPrivateKey(order.PaymentWalletKey)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt payment wallet key: %w", err)
	}

	// 根据链类型执行发射
	switch order.Chain {
	case models.ChainSolana:
		return s.executeSolanaLaunch(order, project, privateKey)
	case models.ChainBSC:
		return s.executeBSCLaunch(order, project, privateKey)
	default:
		return nil, errors.New("unsupported chain")
	}
}

// executeSolanaLaunch 在 Solana 上执行发射
func (s *LaunchService) executeSolanaLaunch(order *models.LaunchOrder, project *models.Project, privateKey string) (*LaunchOrderResult, error) {
	log.Printf("Executing Solana launch for project %s on %s", project.Ticker, order.Launchpad)
	log.Printf("Payment wallet: %s, First buy amount: %.4f SOL", order.PaymentWalletAddress, order.FirstBuyAmount)

	// 调用 launch-service 微服务
	launchResult, err := s.callLaunchServiceForOrder(order, project, privateKey)
	if err != nil {
		return nil, fmt.Errorf("launch service call failed: %w", err)
	}

	if !launchResult.Success {
		return nil, fmt.Errorf("launch failed: %s", launchResult.Error)
	}

	log.Printf("Launch successful! Token address: %s", launchResult.TokenAddress)

	// 查询 Dev 钱包中的代币余额
	var tokensReceived float64 = 0
	balanceResp, err := s.GetTokenBalance(order.Chain, launchResult.TokenAddress, order.PaymentWalletAddress)
	if err != nil {
		log.Printf("Warning: Failed to get token balance: %v", err)
	} else if balanceResp.Success && balanceResp.Balance != "" {
		// 将原始余额转换为可读数量
		balance, _ := strconv.ParseFloat(balanceResp.Balance, 64)
		decimals := balanceResp.Decimals
		if decimals == 0 {
			decimals = 6 // 默认 6 位精度
		}
		tokensReceived = balance / float64(pow10(decimals))
		log.Printf("Dev wallet token balance: %s (%.2f tokens)", balanceResp.Balance, tokensReceived)
	}

	// 将代币转给用户
	tokenTransferTx := ""
	if balanceResp != nil && balanceResp.Success && balanceResp.Balance != "" && balanceResp.Balance != "0" {
		log.Printf("Transferring tokens to user: %s", order.UserWallet)
		transferResp, err := s.TransferTokenToUser(order.Chain, launchResult.TokenAddress, privateKey, order.UserWallet, balanceResp.Balance)
		if err != nil {
			log.Printf("Warning: Failed to transfer tokens to user: %v", err)
		} else if transferResp.Success {
			tokenTransferTx = transferResp.TxHash
			log.Printf("Tokens transferred to user! TxHash: %s", tokenTransferTx)
		} else {
			log.Printf("Warning: Token transfer failed: %s", transferResp.Error)
		}
	}

	return &LaunchOrderResult{
		TokenAddress:    launchResult.TokenAddress,
		LaunchTxHash:    launchResult.LaunchTxHash,
		TokenTransferTx: tokenTransferTx,
		TokensReceived:  tokensReceived,
	}, nil
}

// executeBSCLaunch 在 BSC 上执行发射
func (s *LaunchService) executeBSCLaunch(order *models.LaunchOrder, project *models.Project, privateKey string) (*LaunchOrderResult, error) {
	log.Printf("Executing BSC launch for project %s on %s", project.Ticker, order.Launchpad)
	log.Printf("Payment wallet: %s, First buy amount: %.4f BNB", order.PaymentWalletAddress, order.FirstBuyAmount)

	// 调用 launch-service 微服务
	launchResult, err := s.callLaunchServiceForOrder(order, project, privateKey)
	if err != nil {
		return nil, fmt.Errorf("launch service call failed: %w", err)
	}

	if !launchResult.Success {
		return nil, fmt.Errorf("launch failed: %s", launchResult.Error)
	}

	log.Printf("Launch successful! Token address: %s", launchResult.TokenAddress)

	// 查询 Dev 钱包中的代币余额
	var tokensReceived float64 = 0
	balanceResp, err := s.GetTokenBalance(order.Chain, launchResult.TokenAddress, order.PaymentWalletAddress)
	if err != nil {
		log.Printf("Warning: Failed to get token balance: %v", err)
	} else if balanceResp.Success && balanceResp.Balance != "" {
		balance, _ := strconv.ParseFloat(balanceResp.Balance, 64)
		decimals := balanceResp.Decimals
		if decimals == 0 {
			decimals = 18 // BSC 默认 18 位精度
		}
		tokensReceived = balance / float64(pow10(decimals))
		log.Printf("Dev wallet token balance: %s (%.2f tokens)", balanceResp.Balance, tokensReceived)
	}

	// 将代币转给用户
	tokenTransferTx := ""
	if balanceResp != nil && balanceResp.Success && balanceResp.Balance != "" && balanceResp.Balance != "0" {
		log.Printf("Transferring tokens to user: %s", order.UserWallet)
		transferResp, err := s.TransferTokenToUser(order.Chain, launchResult.TokenAddress, privateKey, order.UserWallet, balanceResp.Balance)
		if err != nil {
			log.Printf("Warning: Failed to transfer tokens to user: %v", err)
		} else if transferResp.Success {
			tokenTransferTx = transferResp.TxHash
			log.Printf("Tokens transferred to user! TxHash: %s", tokenTransferTx)
		} else {
			log.Printf("Warning: Token transfer failed: %s", transferResp.Error)
		}
	}

	return &LaunchOrderResult{
		TokenAddress:    launchResult.TokenAddress,
		LaunchTxHash:    launchResult.LaunchTxHash,
		TokenTransferTx: tokenTransferTx,
		TokensReceived:  tokensReceived,
	}, nil
}

// pow10 计算 10 的 n 次方
func pow10(n int) int64 {
	result := int64(1)
	for i := 0; i < n; i++ {
		result *= 10
	}
	return result
}

// callLaunchServiceForOrder 为订单调用 launch-service 微服务
func (s *LaunchService) callLaunchServiceForOrder(order *models.LaunchOrder, project *models.Project, privateKey string) (*LaunchResult, error) {
	// 计算初始买入金额（支付金额 - Gas 费用 - 优先费）
	// Gas 费用预估：Solana 约 0.005 SOL，BSC 约 0.002 BNB
	gasFeeReserve := 0.01 // 预留 0.01 SOL/BNB 给 Gas 和优先费
	if order.Chain == models.ChainBSC {
		gasFeeReserve = 0.005 // BSC Gas 便宜一些
	}

	initialBuyAmount := order.FirstBuyAmount - gasFeeReserve
	if initialBuyAmount <= 0 {
		initialBuyAmount = 0.0001 // 最小买入金额
	}

	log.Printf("Launch order: payment=%.4f, gasReserve=%.4f, buyAmount=%.4f, taxRate=%d",
		order.FirstBuyAmount, gasFeeReserve, initialBuyAmount, order.TaxRate)

	// 调用带 taxRate 的发射服务
	return s.callLaunchServiceWithTax(string(order.Launchpad), project, privateKey, initialBuyAmount, order.TaxRate)
}

// callLaunchServiceWithTax 调用 launch-service 微服务（支持税率）
func (s *LaunchService) callLaunchServiceWithTax(launchpad string, project *models.Project, privateKey string, initialBuyAmount float64, taxRate int) (*LaunchResult, error) {
	// 验证必须有 Logo
	if project.Logo == "" {
		return nil, errors.New("project logo is required for launch")
	}

	// 构建请求（描述最大200字符）
	// 网站链接统一使用 wagmi ticker 页面
	wagmiWebsite := fmt.Sprintf("https://wagmi.ac/%s", project.Ticker)

	reqBody := LaunchServiceRequest{
		Launchpad:         launchpad,
		CreatorPrivateKey: privateKey,
		InitialBuyAmount:  initialBuyAmount,
		TaxRate:           taxRate,
		Metadata: map[string]interface{}{
			"name":        project.Name,
			"symbol":      project.Ticker,
			"description": truncateDescription(project.Description, 200),
			"image":       project.Logo,
			"twitter":     project.Twitter,
			"telegram":    project.Telegram,
			"website":     wagmiWebsite,
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// 获取 launch-service URL
	launchServiceURL := s.cfg.LaunchServiceURL
	if launchServiceURL == "" {
		launchServiceURL = "http://localhost:3001"
	}

	// 生成 HMAC 签名
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	signature := s.generateLaunchServiceSignature(reqBody, timestamp)

	// 创建请求
	req, err := http.NewRequest("POST", launchServiceURL+"/api/create", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// 设置请求头
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Signature", signature)
	req.Header.Set("X-Timestamp", timestamp)

	// 发送请求
	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call launch service: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// 检查 HTTP 状态码
	if resp.StatusCode == 401 {
		return nil, fmt.Errorf("launch service authentication failed: %s", string(body))
	}
	if resp.StatusCode == 403 {
		return nil, fmt.Errorf("launch service access denied: %s", string(body))
	}
	if resp.StatusCode == 429 {
		return nil, fmt.Errorf("launch service rate limited: %s", string(body))
	}

	var launchResp LaunchServiceResponse
	if err := json.Unmarshal(body, &launchResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if !launchResp.Success {
		return &LaunchResult{
			Success: false,
			Error:   launchResp.Error,
		}, nil
	}

	return &LaunchResult{
		Success:      true,
		TokenAddress: launchResp.TokenAddress,
		LaunchTxHash: launchResp.CreateTxHash,
		DevBuyTxHash: launchResp.BuyTxHash,
	}, nil
}

// RefundPayment 退款 - 将 Dev 钱包中的资金退还给用户
func (s *LaunchService) RefundPayment(order *models.LaunchOrder) (string, error) {
	// 解密支付钱包私钥
	privateKey, err := s.decryptPrivateKey(order.PaymentWalletKey)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt payment wallet key: %w", err)
	}

	// 预留一点 gas 费用于退款交易本身
	refundGasFee := 0.002 // SOL
	if order.Chain == models.ChainBSC {
		refundGasFee = 0.0005 // BNB
	}

	// 计算实际退款金额
	refundAmount := order.PaymentAmount - refundGasFee
	if refundAmount <= 0 {
		return "", fmt.Errorf("refund amount too small after gas fee deduction")
	}

	log.Printf("Refunding %.4f %s to %s (original: %.4f, gas: %.4f)",
		refundAmount,
		order.Chain,
		order.UserWallet,
		order.PaymentAmount,
		refundGasFee,
	)

	// 调用 launch-service 执行退款
	refundResp, err := s.RefundToUser(order.Chain, privateKey, order.UserWallet, refundAmount)
	if err != nil {
		return "", fmt.Errorf("refund failed: %w", err)
	}

	if !refundResp.Success {
		return "", fmt.Errorf("refund failed: %s", refundResp.Error)
	}

	log.Printf("Refund successful! TxHash: %s", refundResp.TxHash)

	return refundResp.TxHash, nil
}
