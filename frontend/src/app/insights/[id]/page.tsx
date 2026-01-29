import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import InsightContent from './InsightContent';
import InsightInteractions from './InsightInteractions';
import BackButton from './BackButton';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://wagmi.ac';

interface PageProps {
  params: Promise<{ id: string }>;
}

// 判断是 UUID 还是 slug
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// 获取内容详情（支持 ID 或 Slug）
async function getContent(idOrSlug: string) {
  try {
    // 根据格式选择 API 端点
    const endpoint = isUUID(idOrSlug) 
      ? `${API_BASE}/contents/${idOrSlug}`
      : `${API_BASE}/contents/slug/${idOrSlug}`;
    
    const res = await fetch(endpoint, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

// 动态生成 metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const content = await getContent(id);
  
  if (!content) {
    return {
      title: '内容不存在',
    };
  }

  const title = content.core_idea_zh || content.core_idea || '创业洞察';
  const description = content.content_zh?.slice(0, 160) || content.raw_content?.slice(0, 160) || '';
  // 优先使用 slug 作为 canonical URL
  const urlPath = content.slug || content.id;
  const url = `${BASE_URL}/insights/${urlPath}`;

  return {
    title: `${title} | WAGMI 洞察`,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url,
      publishedTime: content.published_at,
      authors: content.author ? [content.author] : undefined,
      tags: content.tags || [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

// JSON-LD 结构化数据
function generateJsonLd(content: Record<string, unknown>) {
  const urlPath = (content.slug as string) || (content.id as string);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: content.core_idea_zh || content.core_idea,
    description: (content.content_zh as string)?.slice(0, 160) || '',
    author: {
      '@type': 'Person',
      name: content.author || 'WAGMI',
    },
    publisher: {
      '@type': 'Organization',
      name: 'WAGMI',
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/waggy.png`,
      },
    },
    datePublished: content.published_at,
    dateModified: content.updated_at || content.published_at,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/insights/${urlPath}`,
    },
  };
}

export default async function InsightDetailPage({ params }: PageProps) {
  const { id } = await params;
  const content = await getContent(id);

  if (!content) {
    notFound();
  }

  const jsonLd = generateJsonLd(content);
  const urlPath = content.slug || content.id;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navigation />
      <main className="min-h-screen bg-[#0a0a0a] pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          {/* 返回按钮 - 客户端组件 */}
          <BackButton />

          {/* 主卡片 */}
          <article className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
            {/* 语言切换和时间 - 客户端交互 */}
            <InsightInteractions 
              contentId={content.id}
              publishedAt={content.published_at || content.created_at}
            />

            {/* 核心内容 - 服务端渲染 (SEO) */}
            <InsightContent content={content} />

            {/* CTA 和交互功能 - 客户端组件 */}
            <InsightInteractions 
              contentId={content.id}
              content={content}
              showActions
            />
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
