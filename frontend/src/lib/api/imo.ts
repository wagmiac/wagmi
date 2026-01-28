// IMO API 服务
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// IMO Token 存储 key
const IMO_TOKEN_KEY = 'imo_token';

// 获取存储的 IMO token
export function getIMOToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(IMO_TOKEN_KEY);
}

// 保存 IMO token
export function setIMOToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(IMO_TOKEN_KEY, token);
}

// 清除 IMO token
export function clearIMOToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(IMO_TOKEN_KEY);
}

// 通用请求函数
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth: boolean = false
): Promise<{ success: boolean; data?: T; error?: string; message?: string; meta?: Record<string, unknown> }> {
  const url = `${API_BASE}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  // 如果需要认证，添加 IMO token
  if (requireAuth) {
    const token = getIMOToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ========== 项目 API ==========

export interface ListProjectsParams {
  status?: string;
  chain?: string;
  launchpad?: string;
  page?: number;
  limit?: number;
  order?: string;
}

export async function listProjects(params: ListProjectsParams = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });
  
  return request(`/imo/projects?${searchParams.toString()}`);
}

export async function getProjectByTicker(ticker: string) {
  return request(`/imo/projects/ticker/${ticker}`);
}

export async function getProjectById(id: string) {
  return request(`/imo/projects/${id}`);
}

export async function createProject(data: {
  name: string;
  ticker: string;
  chain?: string;  // 可选，发掘时不选链
  launchpad?: string;  // 可选，发掘时不选发射台
  logo?: string;
  description?: string;
  twitter?: string;
  github?: string;
  website?: string;
  productHunt?: string; // Product Hunt 链接
  discord?: string;     // Discord 链接
  reddit?: string;      // Reddit 链接
  // 支付信息（二选一：支付交易哈希 或 免单码）
  paymentTxHash?: string;
  payerAddress?: string;
  promoCode?: string; // 免单码
}) {
  return request('/imo/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  }, true); // 需要认证
}

export async function updateProject(projectId: string, data: {
  name?: string;
  logo?: string;
  description?: string;
  twitter?: string;
  github?: string;
  website?: string;
  productHunt?: string;
  discord?: string;
  reddit?: string;
}) {
  return request(`/imo/projects/${projectId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, true); // 需要认证
}

// ========== 竞拍 API ==========

export async function getProjectBids(projectId: string) {
  return request(`/imo/projects/${projectId}/bids`);
}

export async function placeBid(projectId: string, data: {
  amount: number;
  txHash: string;
  currency: 'SOL' | 'BNB';
}) {
  return request(`/imo/projects/${projectId}/bids`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ========== 时间线 API ==========

export async function getProjectTimeline(projectId: string) {
  return request(`/imo/projects/${projectId}/timeline`);
}

// ========== 用户 API ==========

export async function getUserByWallet(wallet: string) {
  return request(`/imo/users/wallet/${wallet}`);
}

export async function getUserProjects(userId: string, type?: 'scouted' | 'launched', allWallets?: string[]) {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  // 如果有多个钱包地址，用逗号分隔传递
  if (allWallets && allWallets.length > 0) {
    params.append('wallets', allWallets.join(','));
  }
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return request(`/imo/users/${userId}/projects${queryString}`);
}

export async function getUserBids(userId: string) {
  return request(`/imo/users/${userId}/bids`);
}

// ========== 钱包认证 API ==========

export async function getWalletNonce(wallet: string) {
  return request(`/imo/wallet/nonce?wallet=${wallet}`);
}

export async function verifyWallet(data: {
  wallet: string;
  signature: string;
  chain: 'solana' | 'bsc';
}) {
  return request('/imo/wallet/verify', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ========== 统计 API ==========

export async function getIMOStats() {
  return request('/imo/stats');
}

// ========== 免单码 API ==========

export interface PromoCodeValidateResult {
  success: boolean;
  valid?: boolean;
  code?: string;
  description?: string;
  expires_at?: string;
  error?: string;
}

export async function validatePromoCode(code: string): Promise<PromoCodeValidateResult> {
  const result = await request<PromoCodeValidateResult>(`/imo/promo/validate?code=${encodeURIComponent(code)}`);
  return result as PromoCodeValidateResult;
}

// ========== 认领 API ==========

export async function submitClaimRequest(projectId: string, data: {
  proofType: 'twitter' | 'github' | 'website' | 'other';
  proofUrl: string;
}) {
  return request(`/imo/projects/${projectId}/claims`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ========== 管理员 API ==========

export async function startAuction(projectId: string) {
  return request(`/imo/admin/projects/${projectId}/start-auction`, {
    method: 'POST',
  });
}

export async function endAuction(projectId: string) {
  return request(`/imo/admin/projects/${projectId}/end-auction`, {
    method: 'POST',
  });
}

export async function markLaunched(projectId: string, data: {
  tokenAddress: string;
  launchTxHash?: string;
}) {
  return request(`/imo/admin/projects/${projectId}/launched`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getClaimRequests(projectId: string) {
  return request(`/imo/admin/projects/${projectId}/claims`);
}

export async function approveClaimRequest(claimId: string) {
  return request(`/imo/admin/claims/${claimId}/approve`, {
    method: 'POST',
  });
}

// ========== 发射 API ==========

export async function listLaunchingProjects() {
  return request('/imo/admin/launching');
}

// 为指定发射台生成 Dev 钱包
export async function generateDevWallet(projectId: string, launchpad: string) {
  return request(`/imo/admin/projects/${projectId}/generate-wallet`, {
    method: 'POST',
    body: JSON.stringify({ launchpad }),
  });
}

// 获取项目的所有发射台钱包，或指定发射台的钱包
export async function getDevWallet(projectId: string, launchpad?: string) {
  const url = launchpad 
    ? `/imo/admin/projects/${projectId}/wallet?launchpad=${launchpad}`
    : `/imo/admin/projects/${projectId}/wallet`;
  return request(url);
}

// 导出发射台钱包私钥（仅管理员）
export async function exportDevWalletKey(projectId: string, launchpad: string) {
  return request(`/imo/admin/projects/${projectId}/wallet/export`, {
    method: 'POST',
    body: JSON.stringify({ launchpad }),
  });
}

// AI 评估项目
export async function evaluateProject(projectId: string) {
  return request(`/imo/admin/projects/${projectId}/evaluate`, {
    method: 'POST',
  });
}

export async function launchProject(projectId: string, data?: {
  devBuySOL?: number;
  devBuyBNB?: number;
  launchpad?: string;
  ticker?: string;
  image?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
}) {
  return request(`/imo/admin/projects/${projectId}/launch`, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function getLaunchStatus(projectId: string) {
  return request(`/imo/admin/projects/${projectId}/launch-status`);
}

export async function distributeRevenue(projectId: string) {
  return request(`/imo/admin/projects/${projectId}/distribute`, {
    method: 'POST',
  });
}

export async function getRevenueRecords(projectId: string) {
  return request(`/imo/admin/projects/${projectId}/revenues`);
}

export async function getUserRevenue(wallet: string) {
  return request(`/imo/revenue/${wallet}`);
}

// ========== 新发射流程 API ==========

export interface CreateLaunchOrderRequest {
  chain: 'solana' | 'bsc';
  launchpad: string;
  firstBuyAmount: number;
  userWallet: string;
}

export interface LaunchOrderResponse {
  orderId: string;
  paymentAddress: string;
  amount: number;
  currency: string;
  firstBuyAmount: number;
  gasFee: number;
  expiresAt: string;
  chain: string;
  launchpad: string;
}

export interface LaunchOrder {
  id: string;
  project_id: string;
  user_wallet: string;
  chain: string;
  launchpad: string;
  first_buy_amount: number;
  gas_fee: number;
  payment_wallet_address: string;
  payment_amount: number;
  payment_tx_hash: string;
  payment_confirmed_at: string | null;
  token_address: string;
  launch_tx_hash: string;
  token_transfer_tx: string;
  tokens_received: number;
  status: 'pending' | 'paid' | 'launching' | 'success' | 'failed' | 'refunded';
  error_msg: string;
  created_at: string;
  expires_at: string | null;
  launched_at: string | null;
}

// 创建发射订单
export async function createLaunchOrder(projectId: string, data: CreateLaunchOrderRequest) {
  return request(`/imo/admin/projects/${projectId}/launch-order`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// 获取发射订单详情
export async function getLaunchOrder(orderId: string) {
  return request(`/imo/admin/launch-orders/${orderId}`);
}

// 获取项目的发射订单列表
export async function getProjectLaunchOrders(projectId: string) {
  return request(`/imo/admin/projects/${projectId}/launch-orders`);
}

// 检查支付状态
export async function checkLaunchPayment(orderId: string) {
  return request(`/imo/admin/launch-orders/${orderId}/check-payment`);
}

// 执行发射
export async function executeLaunch(orderId: string) {
  return request(`/imo/admin/launch-orders/${orderId}/execute`, {
    method: 'POST',
  });
}

// 带支付哈希的直接发射
export interface LaunchWithPaymentRequest {
  chain: 'solana' | 'bsc';
  launchpad: string;
  firstBuyAmount: number;
  userWallet: string;
  paymentTxHash: string;
}

export async function launchWithPayment(projectId: string, data: LaunchWithPaymentRequest) {
  return request(`/imo/admin/projects/${projectId}/launch-with-payment`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// 取消发射订单
export async function cancelLaunchOrder(orderId: string) {
  return request(`/imo/admin/launch-orders/${orderId}/cancel`, {
    method: 'POST',
  });
}

// ========== 图片上传 API ==========

export async function uploadProjectLogo(file: File): Promise<{ success: boolean; data?: { url: string; filename: string }; error?: string }> {
  // 使用 Next.js API 路由代理上传，不直接调用 Go 后端
  const url = '/api/admin/tokens/upload';
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // 注意：不要设置 Content-Type header，让浏览器自动设置 multipart/form-data
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败',
    };
  }
}
