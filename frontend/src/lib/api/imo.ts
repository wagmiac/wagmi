// IMO API 服务
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// 通用请求函数
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string; message?: string; meta?: Record<string, unknown> }> {
  const url = `${API_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
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
  chain: string;
  launchpad: string;
  logo?: string;
  description?: string;
  twitter?: string;
  github?: string;
  website?: string;
}) {
  return request('/imo/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
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

export async function getUserProjects(userId: string, type?: 'scouted' | 'launched') {
  const params = type ? `?type=${type}` : '';
  return request(`/imo/users/${userId}/projects${params}`);
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

export async function generateDevWallet(projectId: string, chain?: string) {
  return request(`/imo/admin/projects/${projectId}/generate-wallet`, {
    method: 'POST',
    body: chain ? JSON.stringify({ chain }) : undefined,
  });
}

export async function getDevWallet(projectId: string) {
  return request(`/imo/admin/projects/${projectId}/wallet`);
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
