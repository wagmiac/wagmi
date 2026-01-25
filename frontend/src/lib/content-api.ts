// 内容引擎 API 客户端

const API_BASE = process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:8080/api';

export interface InsightContent {
  id: string;
  slug?: string;  // SEO友好的URL slug
  source: string;
  source_url: string;
  author: string;
  raw_content: string;
  content_zh: string;
  content_en: string;
  tags: string[];
  revenue: string;
  status: string;
  view_count?: number;  // 浏览量
  // 旧字段（兼容）
  core_idea: string;
  key_points: string[];
  target_users: string;
  // 新双语字段
  core_idea_zh?: string;
  core_idea_en?: string;
  key_points_zh?: string[];
  key_points_en?: string[];
  target_users_zh?: string;
  target_users_en?: string;
  revenue_data: string;
  revenue_data_zh?: string;
  revenue_data_en?: string;
  original_lang: string;
  created_at: string;
  processed_at: string;
  published_at: string;
}

export interface InsightListResponse {
  success: boolean;
  data: {
    items: InsightContent[];
    total: number;
    page: number;
    limit: number;
  };
}

// 获取已发布的内容列表
export async function getPublishedContents(params?: {
  page?: number;
  limit?: number;
  tag?: string;
  search?: string;
}): Promise<InsightListResponse> {
  const searchParams = new URLSearchParams({
    status: 'published',
    page: String(params?.page || 1),
    limit: String(params?.limit || 20),
  });
  
  if (params?.tag) {
    searchParams.set('tag', params.tag);
  }

  if (params?.search) {
    searchParams.set('search', params.search);
  }

  const res = await fetch(`${API_BASE}/public/contents?${searchParams}`, {
    cache: 'no-store', // 客户端组件不缓存
  });

  if (!res.ok) {
    throw new Error('Failed to fetch contents');
  }

  return res.json();
}

// 获取单个内容详情
export async function getContentById(id: string): Promise<{ success: boolean; data: InsightContent }> {
  const res = await fetch(`${API_BASE}/contents/${id}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch content');
  }

  return res.json();
}

// 格式化时间
export function formatTimeAgo(dateString: string, locale: 'zh' | 'en' = 'zh'): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (locale === 'en') {
    if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 30) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US');
    }
  }

  if (diffMins < 60) {
    return `${diffMins} 分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours} 小时前`;
  } else if (diffDays < 30) {
    return `${diffDays} 天前`;
  } else {
    return date.toLocaleDateString('zh-CN');
  }
}
