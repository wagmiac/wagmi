'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/lib/auth-context';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

interface Content {
  id: string;
  source: string;
  source_url: string;
  author: string;
  raw_content: string;
  content_zh: string;
  content_en: string;
  core_idea: string;
  revenue_data: string;
  key_points: string[];
  target_users: string;
  tags: string[];
  status: string;
  original_lang: string;
  created_at: string;
  processed_at: string;
}

type TabType = 'pending' | 'published' | 'rejected';

export default function AdminContentReviewClient() {
  const { token } = useAuth();
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  // 加载内容列表
  const loadContents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/contents?status=${activeTab}&page=${page}&limit=${limit}`);
      const data = await res.json();
      if (data.success) {
        setContents(data.data?.items || []);
        setTotal(data.data?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load contents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContents();
    setSelectedIds(new Set()); // 切换 tab 或翻页时清空选择
  }, [activeTab, page]);

  // 审核操作
  const handleReview = async (id: string, action: 'publish' | 'reject') => {
    const newStatus = action === 'publish' ? 'published' : 'rejected';
    try {
      const res = await fetch(`${API_BASE}/contents/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(action === 'publish' ? '✅ 已发布' : '❌ 已拒绝');
        setSelectedContent(null);
        loadContents();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      setMessage('操作失败');
    }
  };

  // 批量发布
  const handleBatchPublish = async () => {
    if (!confirm(`确定发布所有 ${contents.length} 条待审核内容吗？`)) return;
    
    let success = 0;
    for (const content of contents) {
      try {
        const res = await fetch(`${API_BASE}/contents/${content.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ status: 'published' }),
        });
        const data = await res.json();
        if (data.success) success++;
      } catch {}
    }
    setMessage(`✅ 已发布 ${success} 条内容`);
    loadContents();
    setTimeout(() => setMessage(''), 3000);
  };

  // 删除内容
  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这条内容吗？')) return;
    try {
      const res = await fetch(`${API_BASE}/contents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessage('🗑 已删除');
        setSelectedContent(null);
        loadContents();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch {
      setMessage('删除失败');
    }
  };

  // 切换选择
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === contents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contents.map(c => c.id)));
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedIds.size} 条内容吗？此操作不可恢复！`)) return;
    
    let success = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(`${API_BASE}/contents/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) success++;
      } catch {}
    }
    setMessage(`🗑 已删除 ${success} 条内容`);
    setSelectedIds(new Set());
    setSelectedContent(null);
    loadContents();
    setTimeout(() => setMessage(''), 3000);
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  // Tab 配置
  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'pending', label: '待审核', icon: '⏳' },
    { key: 'published', label: '已发布', icon: '✅' },
    { key: 'rejected', label: '已拒绝', icon: '❌' },
  ];

  return (
    <AdminLayout title="内容审核">
      <div>
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-400">审核和管理创业洞察内容</p>
          <div className="flex items-center gap-4">
            {selectedIds.size > 0 && (
              <button
                onClick={handleBatchDelete}
                className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition text-sm"
              >
                🗑 删除选中 ({selectedIds.size})
              </button>
            )}
            {activeTab === 'pending' && contents.length > 0 && (
              <button
                onClick={handleBatchPublish}
                className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition text-sm"
              >
                ✅ 全部发布 ({contents.length})
              </button>
            )}
          </div>
        </div>

        {/* 提示消息 */}
        {message && (
          <div className="mb-6 p-4 bg-[#FF8C00]/10 border border-[#FF8C00]/30 rounded-xl text-[#FF8C00]">
            {message}
          </div>
        )}

        {/* Tab 切换 */}
        <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
          {tabs.map((tab) => (
          <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
                setSelectedContent(null);
              }}
              className={`px-6 py-3 rounded-xl transition flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-[#FF8C00] text-black font-semibold'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* 左侧：列表 */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-20 text-gray-500">加载中...</div>
            ) : contents.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                暂无{tabs.find((t) => t.key === activeTab)?.label}内容
              </div>
            ) : (
              <>
                {/* 全选按钮 */}
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 text-sm rounded-lg transition"
                  >
                    <span className={`w-4 h-4 border rounded flex items-center justify-center ${
                      selectedIds.size === contents.length && contents.length > 0
                        ? 'bg-[#FF8C00] border-[#FF8C00]'
                        : 'border-gray-500'
                    }`}>
                      {selectedIds.size === contents.length && contents.length > 0 && '✓'}
                    </span>
                    {selectedIds.size === contents.length ? '取消全选' : '全选'}
                  </button>
                  {selectedIds.size > 0 && (
                    <span className="text-gray-500 text-sm">已选择 {selectedIds.size} 项</span>
                  )}
                </div>

                {contents.map((content) => (
                  <div
                    key={content.id}
                    className={`bg-[#1a1a1a] border rounded-xl p-4 transition ${
                      selectedContent?.id === content.id
                        ? 'border-[#FF8C00]'
                          : selectedIds.has(content.id)
                          ? 'border-[#FF8C00]/50'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* 复选框 */}
                        <button
                          onClick={() => toggleSelect(content.id)}
                          className={`mt-1 w-5 h-5 border rounded flex items-center justify-center shrink-0 transition ${
                            selectedIds.has(content.id)
                              ? 'bg-[#FF8C00] border-[#FF8C00] text-black'
                              : 'border-gray-500 hover:border-gray-400'
                          }`}
                        >
                          {selectedIds.has(content.id) && '✓'}
                        </button>

                        {/* 内容区域 */}
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => setSelectedContent(content)}
                        >
                          <h3 className="text-white font-medium mb-2 line-clamp-2">
                            {content.core_idea || content.raw_content?.slice(0, 100)}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                            <span>📰 {content.source || 'Unknown'}</span>
                            <span>🕐 {formatTime(content.created_at)}</span>
                            {content.revenue_data && (
                              <span className="text-[#00E5FF]">💰 {content.revenue_data}</span>
                            )}
                          </div>
                        </div>
                        {activeTab === 'pending' && (
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReview(content.id, 'publish');
                              }}
                              className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20"
                              title="发布"
                            >
                              ✓
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReview(content.id, 'reject');
                              }}
                              className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"
                              title="拒绝"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* 分页 */}
                  {total > limit && (
                    <div className="flex items-center justify-center gap-4 pt-4">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 disabled:opacity-50"
                      >
                        上一页
                      </button>
                      <span className="text-gray-500">
                        {page} / {Math.ceil(total / limit)}
                      </span>
                      <button
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= Math.ceil(total / limit)}
                        className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 disabled:opacity-50"
                      >
                        下一页
                      </button>
                    </div>
                  )}
                </>
              )}
          </div>

          {/* 右侧：详情预览 */}
          <div className="lg:sticky lg:top-24 lg:self-start">
              {selectedContent ? (
                <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
                  <div className="p-6 border-b border-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-[#FF8C00]">
                        💡 {selectedContent.core_idea || '创业洞察'}
                      </h2>
                      <button
                        onClick={() => setSelectedContent(null)}
                        className="text-gray-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    {selectedContent.revenue_data && (
                      <div className="mb-4 p-3 bg-[#00E5FF]/10 rounded-lg">
                        <span className="text-[#00E5FF]">💰 {selectedContent.revenue_data}</span>
                      </div>
                    )}

                    {/* 中文内容 */}
                    {selectedContent.content_zh && (
                      <div className="mb-4">
                        <h4 className="text-sm text-gray-400 mb-2">🇨🇳 中文</h4>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap">
                          {selectedContent.content_zh}
                        </p>
                      </div>
                    )}

                    {/* 英文内容 */}
                    {selectedContent.content_en && (
                      <div className="mb-4">
                        <h4 className="text-sm text-gray-400 mb-2">🇺🇸 English</h4>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap">
                          {selectedContent.content_en}
                        </p>
                      </div>
                    )}

                    {/* 关键点 */}
                    {selectedContent.key_points && selectedContent.key_points.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm text-gray-400 mb-2">🔑 关键点</h4>
                        <ul className="space-y-1">
                          {selectedContent.key_points.map((point, idx) => (
                            <li key={idx} className="text-sm text-gray-300 flex gap-2">
                              <span className="text-[#FF8C00]">•</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 目标用户 */}
                    {selectedContent.target_users && (
                      <div className="mb-4">
                        <h4 className="text-sm text-gray-400 mb-2">🎯 目标用户</h4>
                        <p className="text-gray-300 text-sm">{selectedContent.target_users}</p>
                      </div>
                    )}

                    {/* 标签 */}
                    {selectedContent.tags && selectedContent.tags.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {selectedContent.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-white/5 text-gray-400 text-xs rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 原文链接 */}
                    {selectedContent.source_url && (
                      <a
                        href={selectedContent.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-500 hover:text-gray-300"
                      >
                        查看原文 →
                      </a>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="p-4 bg-white/5 flex gap-3">
                    {activeTab === 'pending' && (
                      <>
                        <button
                          onClick={() => handleReview(selectedContent.id, 'publish')}
                          className="flex-1 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition"
                        >
                          ✅ 发布
                        </button>
                        <button
                          onClick={() => handleReview(selectedContent.id, 'reject')}
                          className="flex-1 py-3 bg-red-500/20 text-red-400 font-semibold rounded-xl hover:bg-red-500/30 transition"
                        >
                          ❌ 拒绝
                        </button>
                      </>
                    )}
                    {activeTab === 'rejected' && (
                      <button
                        onClick={() => handleReview(selectedContent.id, 'publish')}
                        className="flex-1 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition"
                      >
                        ✅ 恢复并发布
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(selectedContent.id)}
                      className="px-4 py-3 bg-white/5 text-gray-400 rounded-xl hover:bg-white/10 transition"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-12 text-center text-gray-500">
                  ← 选择一条内容查看详情
                </div>
              )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
