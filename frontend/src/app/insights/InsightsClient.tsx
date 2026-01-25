'use client';

import { useState, useEffect, useCallback } from 'react';
import InsightCard from '@/components/InsightCard';
import { getPublishedContents, InsightContent } from '@/lib/content-api';
import { useI18n } from '@/lib/i18n';

// 标签映射：实际值 -> i18n key
const TAG_KEYS = [
  { value: '全部', key: 'insights.tagAll' },
  { value: 'AI工具', key: 'insights.tagAITools' },
  { value: 'SaaS', key: 'insights.tagSaaS' },
  { value: '独立开发', key: 'insights.tagIndieDev' },
  { value: '变现', key: 'insights.tagMonetization' },
  { value: '案例', key: 'insights.tagCaseStudy' },
];

export default function InsightsClient() {
  const { t } = useI18n();
  const [contents, setContents] = useState<InsightContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTag, setActiveTag] = useState('全部');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const limit = 12;

  const loadContents = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const tag = activeTag === '全部' ? undefined : activeTag;
      const res = await getPublishedContents({ page, limit, tag, search: searchQuery || undefined });
      setContents(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load contents:', err);
      setError(t('insights.loadError'));
    } finally {
      setLoading(false);
    }
  }, [activeTag, page, limit, searchQuery, t]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('insights.searchPlaceholder')}
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50 transition pr-24"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-20 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-[#FF8C00] text-black rounded-full font-medium hover:bg-[#FFAD33] transition"
            >
              {t('insights.searchButton')}
            </button>
          </div>
          {searchQuery && (
            <p className="text-center text-gray-400 text-sm mt-3">
              {t('insights.searchResult').replace('{query}', searchQuery)}
            </p>
          )}
        </form>

        {/* 标签筛选 */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {TAG_KEYS.map((tag) => (
            <button
              key={tag.value}
              onClick={() => {
                setActiveTag(tag.value);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeTag === tag.value
                  ? 'bg-[#FF8C00] text-black'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t(tag.key)}
            </button>
          ))}
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF8C00]"></div>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={loadContents}
              className="px-6 py-2 bg-[#FF8C00] text-black rounded-full hover:bg-[#FFAD33] transition"
            >
              {t('insights.retry')}
            </button>
          </div>
        )}

        {/* 空状态 */}
        {!loading && !error && contents.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-400 text-lg">{t('insights.noContent')}</p>
            <p className="text-gray-500 text-sm mt-2">
              {t('insights.noContentDesc')}
            </p>
          </div>
        )}

        {/* 内容列表 */}
        {!loading && !error && contents.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contents.map((content) => (
                <InsightCard key={content.id} content={content} />
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-12">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {t('insights.prevPage')}
                </button>
                <span className="text-gray-400">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {t('insights.nextPage')}
                </button>
              </div>
            )}

            {/* 统计信息 */}
            <div className="text-center mt-8 text-gray-500 text-sm">
              {t('insights.totalInsights').replace('{count}', String(total))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
