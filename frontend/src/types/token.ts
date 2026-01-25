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
  volume_24h?: string;
  holders?: number;
  created_at: string;
  updated_at?: string;
  published_at?: string;
}

export interface CreateTokenRequest {
  name: string;
  symbol: string;
  logo: string;
  description: string;
  website?: string;
  twitter?: string;
  telegram?: string;
}

export interface UpdateTokenRequest {
  name?: string;
  symbol?: string;
  logo?: string;
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  contract_address?: string;
  chain?: string;
}

export interface PublishTokenRequest {
  contract_address: string;
  chain: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
