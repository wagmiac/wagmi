/**
 * Token API - 调用 Go 后端 API
 * 替代原来的 JSON 文件存储
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:8080/api';

export interface Token {
  id: string;
  name: string;
  symbol: string;
  logo: string;
  description: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  contract_address?: string;
  chain: string;
  status: 'draft' | 'published';
  market_cap?: string;
  price?: string;
  price_change?: string;
  volume_24h?: string;
  holders?: number;
  progress?: number;
  created_at: string;
  updated_at?: string;
  published_at?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 获取已发布的代币列表（公开）
export async function getPublishedTokens(): Promise<Token[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/tokens`, {
      cache: 'no-store',
    });
    const data: ApiResponse<Token[]> = await res.json();
    if (data.success && data.data) {
      return data.data;
    }
    console.error('Failed to fetch published tokens:', data.error);
    return [];
  } catch (error) {
    console.error('Error fetching published tokens:', error);
    return [];
  }
}

// 根据 ID 获取代币（公开）
export async function getTokenById(id: string): Promise<Token | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/tokens/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return null;
    }
    const data: ApiResponse<Token> = await res.json();
    if (data.success && data.data) {
      return data.data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching token by ID:', error);
    return null;
  }
}

// ==================== 管理员 API ====================

// 获取所有代币（管理员）
export async function adminGetAllTokens(authToken?: string): Promise<Token[]> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(`${API_BASE_URL}/admin/tokens`, {
      headers,
      cache: 'no-store',
    });
    const data: ApiResponse<Token[]> = await res.json();
    if (data.success && data.data) {
      return data.data;
    }
    console.error('Failed to fetch admin tokens:', data.error);
    return [];
  } catch (error) {
    console.error('Error fetching admin tokens:', error);
    return [];
  }
}

// 根据 ID 获取代币（管理员）
export async function adminGetTokenById(id: string, authToken?: string): Promise<Token | null> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(`${API_BASE_URL}/admin/tokens/${id}`, {
      headers,
      cache: 'no-store',
    });
    if (!res.ok) {
      return null;
    }
    const data: ApiResponse<Token> = await res.json();
    if (data.success && data.data) {
      return data.data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching admin token by ID:', error);
    return null;
  }
}

// 创建代币
export async function createToken(
  tokenData: Omit<Token, 'id' | 'created_at' | 'updated_at' | 'status'>,
  authToken?: string
): Promise<Token | null> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(`${API_BASE_URL}/admin/tokens`, {
      method: 'POST',
      headers,
      body: JSON.stringify(tokenData),
    });
    const data: ApiResponse<Token> = await res.json();
    if (data.success && data.data) {
      return data.data;
    }
    console.error('Failed to create token:', data.error);
    return null;
  } catch (error) {
    console.error('Error creating token:', error);
    return null;
  }
}

// 更新代币
export async function updateToken(
  id: string,
  updates: Partial<Token>,
  authToken?: string
): Promise<Token | null> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(`${API_BASE_URL}/admin/tokens/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    const data: ApiResponse<Token> = await res.json();
    if (data.success && data.data) {
      return data.data;
    }
    console.error('Failed to update token:', data.error);
    return null;
  } catch (error) {
    console.error('Error updating token:', error);
    return null;
  }
}

// 发布代币
export async function publishToken(
  id: string,
  publishData: { contract_address: string; chain: string },
  authToken?: string
): Promise<Token | null> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(`${API_BASE_URL}/admin/tokens/${id}/publish`, {
      method: 'POST',
      headers,
      body: JSON.stringify(publishData),
    });
    const data: ApiResponse<Token> = await res.json();
    if (data.success && data.data) {
      return data.data;
    }
    console.error('Failed to publish token:', data.error);
    return null;
  } catch (error) {
    console.error('Error publishing token:', error);
    return null;
  }
}

// 删除代币
export async function deleteToken(id: string, authToken?: string): Promise<boolean> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(`${API_BASE_URL}/admin/tokens/${id}`, {
      method: 'DELETE',
      headers,
    });
    const data: ApiResponse<null> = await res.json();
    return data.success;
  } catch (error) {
    console.error('Error deleting token:', error);
    return false;
  }
}
