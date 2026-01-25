'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import AdminGuard from '@/components/AdminGuard';
import { useAuth } from '@/lib/auth-context';

const API_BASE = process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:8080/api';

interface SearchConfig {
  id: number;
  keyword: string;
  cron_expr: string;
  tags: string[];
  enabled: boolean;
  last_run_at: string | null;
  last_result: string;
  created_at: string;
}

export default function AdminSearchConfigClient() {
  const { token } = useAuth();
  const [configs, setConfigs] = useState<SearchConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    keyword: '',
    cron_expr: '0 */6 * * *',
    tags: [] as string[],
    enabled: true,
  });
  const [tagInput, setTagInput] = useState('');
  const [message, setMessage] = useState('');
  const [runningId, setRunningId] = useState<number | null>(null);

  // AI 扩展相关状态
  const [showExpandForm, setShowExpandForm] = useState(false);
  const [expandData, setExpandData] = useState({
    seed_keyword: '',
    count: 10,
    tags: [] as string[],
    cron_expr: '0 0 */6 * * *',
    auto_create: true,
  });
  const [expandTagInput, setExpandTagInput] = useState('');
  const [expanding, setExpanding] = useState(false);
  const [runningAll, setRunningAll] = useState(false);

  // 一键运行所有搜索
  const handleRunAll = async () => {
    const enabledConfigs = configs.filter(c => c.enabled);
    if (enabledConfigs.length === 0) {
      setMessage('没有已启用的搜索配置');
      return;
    }
    
    if (!confirm(`确定要运行所有 ${enabledConfigs.length} 个已启用的搜索配置吗？`)) return;
    
    setRunningAll(true);
    setMessage('正在运行所有搜索配置...');
    
    let totalSearched = 0;
    let totalImported = 0;
    let successCount = 0;
    let failCount = 0;
    
    for (const config of enabledConfigs) {
      try {
        const res = await fetch(`${API_BASE}/search-configs/${config.id}/run`, {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.success) {
          totalSearched += data.data?.searched || 0;
          totalImported += data.data?.imported || 0;
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }
    
    setMessage(`✅ 运行完成！成功: ${successCount}, 失败: ${failCount}, 搜索: ${totalSearched}, 导入: ${totalImported}`);
    loadConfigs();
    setRunningAll(false);
  };

  // 加载配置列表
  const loadConfigs = async () => {
    try {
      const res = await fetch(`${API_BASE}/search-configs`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setConfigs(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load configs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadConfigs();
    }
  }, [token]);

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    try {
      const url = editingId
        ? `${API_BASE}/search-configs/${editingId}`
        : `${API_BASE}/search-configs`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setMessage(editingId ? '更新成功！' : '创建成功！');
        setShowForm(false);
        setEditingId(null);
        resetForm();
        loadConfigs();
      } else {
        setMessage(data.error || '操作失败');
      }
    } catch {
      setMessage('网络错误');
    }
  };

  // 删除配置
  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这个配置吗？')) return;

    try {
      const res = await fetch(`${API_BASE}/search-configs/${id}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        loadConfigs();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // 手动运行
  const handleRun = async (id: number) => {
    setRunningId(id);
    try {
      const res = await fetch(`${API_BASE}/search-configs/${id}/run`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`运行完成！搜索: ${data.data?.searched || 0}, 导入: ${data.data?.imported || 0}`);
        loadConfigs();
      } else {
        setMessage(data.error || '运行失败');
      }
    } catch {
      setMessage('运行失败');
    } finally {
      setRunningId(null);
    }
  };

  // 切换启用状态
  const handleToggle = async (config: SearchConfig) => {
    try {
      const res = await fetch(`${API_BASE}/search-configs/${config.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...config, enabled: !config.enabled }),
      });
      const data = await res.json();
      if (data.success) {
        loadConfigs();
      }
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  // 编辑配置
  const handleEdit = (config: SearchConfig) => {
    setFormData({
      keyword: config.keyword,
      cron_expr: config.cron_expr,
      tags: config.tags || [],
      enabled: config.enabled,
    });
    setEditingId(config.id);
    setShowForm(true);
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      keyword: '',
      cron_expr: '0 */6 * * *',
      tags: [],
      enabled: true,
    });
    setTagInput('');
  };

  // 格式化时间
  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  // 预设 cron 选项
  const scheduleOptions = [
    { label: '每小时', value: '0 * * * *' },
    { label: '每2小时', value: '0 */2 * * *' },
    { label: '每6小时', value: '0 */6 * * *' },
    { label: '每12小时', value: '0 */12 * * *' },
    { label: '每天', value: '0 0 * * *' },
    { label: '每周一', value: '0 0 * * 1' },
  ];

  // AI 扩展关键词
  const handleExpand = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpanding(true);
    setMessage('');

    try {
      const res = await fetch(`${API_BASE}/search-configs/expand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(expandData),
      });

      const data = await res.json();
      if (data.success) {
        setMessage(`🎉 AI 生成了 ${data.keywords?.length || 0} 个关键词，创建了 ${data.created} 个搜索配置，跳过 ${data.skipped} 个已存在的`);
        setShowExpandForm(false);
        setExpandData({
          seed_keyword: '',
          count: 10,
          tags: [],
          cron_expr: '0 0 */6 * * *',
          auto_create: true,
        });
        setExpandTagInput('');
        loadConfigs();
      } else {
        setMessage(data.error || '扩展失败');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setExpanding(false);
    }
  };

  return (
    <AdminGuard>
      <Navigation />
      <main className="min-h-screen bg-[#0a0a0a] pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-6">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">🔍 搜索配置管理</h1>
              <p className="text-gray-400">管理内容引擎的自动搜索任务</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRunAll}
                disabled={runningAll || configs.filter(c => c.enabled).length === 0}
                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {runningAll ? '⏳ 运行中...' : '🚀 运行全部'}
              </button>
              <button
                onClick={() => {
                  setShowExpandForm(true);
                  setShowForm(false);
                }}
                className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-500 transition"
              >
                🤖 AI 扩展
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setEditingId(null);
                  setShowForm(true);
                  setShowExpandForm(false);
                }}
                className="px-6 py-3 bg-[#FF8C00] text-black font-semibold rounded-xl hover:bg-[#FFAD33] transition"
              >
                + 新建配置
              </button>
            </div>
          </div>

          {/* 提示消息 */}
          {message && (
            <div className="mb-6 p-4 bg-[#FF8C00]/10 border border-[#FF8C00]/30 rounded-xl text-[#FF8C00]">
              {message}
            </div>
          )}

          {/* AI 扩展表单 */}
          {showExpandForm && (
            <div className="mb-8 bg-[#1a1a1a] border border-purple-500/30 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-2">🤖 AI 智能扩展关键词</h2>
              <p className="text-gray-400 text-sm mb-6">输入一个种子词，AI 会自动生成多个相关搜索关键词并创建配置</p>
              <form onSubmit={handleExpand} className="space-y-6">
                {/* 种子词 */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">种子关键词</label>
                  <input
                    type="text"
                    value={expandData.seed_keyword}
                    onChange={(e) => setExpandData({ ...expandData, seed_keyword: e.target.value })}
                    placeholder="例如：独立开发者变现、AI 工具创业"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                    required
                  />
                </div>

                {/* 生成数量 */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">生成数量</label>
                  <select
                    value={expandData.count}
                    onChange={(e) => setExpandData({ ...expandData, count: parseInt(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500/50"
                  >
                    <option value={5} className="bg-[#1a1a1a]">5 个</option>
                    <option value={10} className="bg-[#1a1a1a]">10 个</option>
                    <option value={15} className="bg-[#1a1a1a]">15 个</option>
                    <option value={20} className="bg-[#1a1a1a]">20 个</option>
                  </select>
                </div>

                {/* 标签 */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">自动添加标签</label>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {expandData.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm flex items-center gap-1"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() =>
                            setExpandData({
                              ...expandData,
                              tags: expandData.tags.filter((_, i) => i !== idx),
                            })
                          }
                          className="hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={expandTagInput}
                    onChange={(e) => setExpandTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && expandTagInput.trim()) {
                        e.preventDefault();
                        setExpandData({
                          ...expandData,
                          tags: [...expandData.tags, expandTagInput.trim()],
                        });
                        setExpandTagInput('');
                      }
                    }}
                    placeholder="输入标签后按回车添加"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                {/* 自动创建 */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="autoCreate"
                    checked={expandData.auto_create}
                    onChange={(e) => setExpandData({ ...expandData, auto_create: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <label htmlFor="autoCreate" className="text-gray-300">
                    自动创建搜索配置（取消则只预览关键词）
                  </label>
                </div>

                {/* 按钮 */}
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={expanding}
                    className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-500 transition disabled:opacity-50"
                  >
                    {expanding ? '🤖 AI 正在生成...' : '🚀 开始扩展'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowExpandForm(false)}
                    className="px-6 py-3 bg-white/10 text-gray-300 rounded-xl hover:bg-white/20 transition"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 新建/编辑表单 */}
          {showForm && (
            <div className="mb-8 bg-[#1a1a1a] border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-6">
                {editingId ? '编辑配置' : '新建搜索配置'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 关键词 */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">搜索关键词</label>
                  <input
                    type="text"
                    value={formData.keyword}
                    onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                    placeholder="indie hacker $10k MRR"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">搜索 Twitter 的关键词，例如：indie hacker revenue</p>
                </div>

                {/* 调度 */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">执行频率</label>
                  <select
                    value={formData.cron_expr}
                    onChange={(e) => setFormData({ ...formData, cron_expr: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF8C00]/50"
                  >
                    {scheduleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#1a1a1a]">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 标签 */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">自动添加标签</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="输入标签后按回车"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
                            setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
                            setTagInput('');
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-[#FF8C00]/20 text-[#FF8C00] rounded-full text-sm flex items-center gap-2"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, tags: formData.tags.filter((_, i) => i !== idx) })}
                          className="hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* 启用状态 */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="w-5 h-5 accent-[#FF8C00]"
                  />
                  <label htmlFor="enabled" className="text-gray-300 cursor-pointer">
                    立即启用自动执行
                  </label>
                </div>

                {/* 按钮 */}
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#FF8C00] text-black font-semibold rounded-xl hover:bg-[#FFAD33] transition"
                  >
                    {editingId ? '保存修改' : '创建配置'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                    className="px-6 py-3 border border-white/20 text-gray-300 rounded-xl hover:bg-white/5 transition"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 配置列表 */}
          {loading ? (
            <div className="text-center py-20 text-gray-500">加载中...</div>
          ) : configs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 mb-4">还没有搜索配置</p>
              <button
                onClick={() => setShowForm(true)}
                className="text-[#FF8C00] hover:underline"
              >
                创建第一个配置
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 hover:border-white/20 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{config.keyword}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            config.enabled
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {config.enabled ? '运行中' : '已停止'}
                        </span>
                      </div>
                      {config.tags && config.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {config.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-[#FF8C00]/10 text-[#FF8C00] text-xs rounded-full">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span>📅 {scheduleOptions.find((s) => s.value === config.cron_expr)?.label || config.cron_expr}</span>
                        <span>🕐 上次运行: {formatTime(config.last_run_at)}</span>
                        {config.last_result && (
                          <span className="text-gray-400">📊 {config.last_result}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRun(config.id)}
                        disabled={runningId === config.id}
                        className="px-4 py-2 bg-[#00E5FF]/10 text-[#00E5FF] rounded-lg hover:bg-[#00E5FF]/20 disabled:opacity-50 transition text-sm"
                      >
                        {runningId === config.id ? '运行中...' : '▶ 手动运行'}
                      </button>
                      <button
                        onClick={() => handleToggle(config)}
                        className={`px-4 py-2 rounded-lg text-sm transition ${
                          config.enabled
                            ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                            : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                        }`}
                      >
                        {config.enabled ? '⏸ 暂停' : '▶ 启用'}
                      </button>
                      <button
                        onClick={() => handleEdit(config)}
                        className="px-4 py-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 transition text-sm"
                      >
                        ✏️ 编辑
                      </button>
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition text-sm"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </AdminGuard>
  );
}
