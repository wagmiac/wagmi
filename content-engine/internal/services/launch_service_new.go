package services

import (
	"content-engine/internal/models"
	"errors"
	"fmt"
	"log"
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
	// TODO: 实际实现需要调用 Solana RPC
	// 这里是模拟实现，开发测试用

	log.Printf("Checking Solana balance for address: %s", address)

	// 模拟返回：假设余额为用户已付款（用于测试）
	// 生产环境需要调用实际的 RPC 接口
	// rpc.GetBalance(address) 等

	return 0, "", nil // 默认返回0余额
}

// checkBSCBalance 检查 BSC 余额
func (s *LaunchService) checkBSCBalance(address string) (float64, string, error) {
	// TODO: 实际实现需要调用 BSC RPC
	// 这里是模拟实现，开发测试用

	log.Printf("Checking BSC balance for address: %s", address)

	return 0, "", nil
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

	// TODO: 实际实现步骤：
	// 1. 构建代币元数据（使用项目信息）
	//    - name: project.Name
	//    - symbol: project.Ticker
	//    - image: project.Logo
	//    - description: project.Description
	//    - website: project.Website
	//    - twitter: project.Twitter
	//
	// 2. 根据发射台调用不同的 API/合约
	//    - pump.fun: 调用 pump.fun API
	//    - trends.fun: 调用 trends.fun API
	//    - bags.fm: 调用 bags.fm API
	//
	// 3. 使用 Jito Bundle 发送交易（可选，用于抢先交易保护）
	//
	// 4. 发射时使用 (PaymentAmount - GasFee) 作为首单购买金额
	//
	// 5. 发射成功后，将获得的代币转给 UserWallet

	// 模拟发射结果（开发测试用）
	result := &LaunchOrderResult{
		TokenAddress:    fmt.Sprintf("So%s%s", project.Ticker[:min(3, len(project.Ticker))], randomHex(8)),
		LaunchTxHash:    randomHex(64),
		TokenTransferTx: randomHex(64),
		TokensReceived:  1000000000, // 模拟收到的代币数量
	}

	log.Printf("Launch successful! Token address: %s", result.TokenAddress)
	log.Printf("Tokens transferred to user wallet: %s", order.UserWallet)

	return result, nil
}

// executeBSCLaunch 在 BSC 上执行发射
func (s *LaunchService) executeBSCLaunch(order *models.LaunchOrder, project *models.Project, privateKey string) (*LaunchOrderResult, error) {
	log.Printf("Executing BSC launch for project %s on %s", project.Ticker, order.Launchpad)
	log.Printf("Payment wallet: %s, First buy amount: %.4f BNB", order.PaymentWalletAddress, order.FirstBuyAmount)

	// TODO: 实际实现步骤：
	// 1. 构建代币元数据
	// 2. 调用 flap.sh 合约
	// 3. 发射成功后将代币转给 UserWallet

	// 模拟发射结果
	result := &LaunchOrderResult{
		TokenAddress:    "0x" + randomHex(40),
		LaunchTxHash:    "0x" + randomHex(64),
		TokenTransferTx: "0x" + randomHex(64),
		TokensReceived:  1000000000,
	}

	log.Printf("Launch successful! Token address: %s", result.TokenAddress)

	return result, nil
}

// RefundPayment 退款
func (s *LaunchService) RefundPayment(order *models.LaunchOrder) (string, error) {
	// 解密支付钱包私钥
	privateKey, err := s.decryptPrivateKey(order.PaymentWalletKey)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt payment wallet key: %w", err)
	}

	log.Printf("Refunding %.4f to %s", order.PaymentAmount, order.UserWallet)

	// TODO: 实际实现：
	// 1. 从支付钱包转账给用户钱包
	// 2. 返回交易哈希

	// 模拟退款交易
	var txHash string
	switch order.Chain {
	case models.ChainSolana:
		txHash = randomHex(64)
	case models.ChainBSC:
		txHash = "0x" + randomHex(64)
	}

	log.Printf("Refund tx: %s (private key length: %d)", txHash, len(privateKey))

	return txHash, nil
}
