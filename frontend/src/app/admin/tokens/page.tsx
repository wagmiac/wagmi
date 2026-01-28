"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/components/ui/Toast";

interface Token {
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
  created_at: string;
}

type TabType = 'all' | 'draft' | 'published';

export default function AdminTokensPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }
    fetchTokens();
  }, [user, router]);

  const fetchTokens = async () => {
    try {
      const res = await fetch('/api/admin/tokens', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTokens(data.success ? data.data : []);
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个代币吗？')) return;
    
    try {
      const res = await fetch(`/api/admin/tokens/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!res.ok) throw new Error('Failed to delete');
      setTokens(tokens.filter(t => t.id !== id));
      toast.success('删除成功');
    } catch (error) {
      console.error('Failed to delete token:', error);
      toast.error('删除失败');
    }
  };

  const copyTokenLink = (token: Token) => {
    // 使用 symbol 作为链接，更简洁友好（使用小写，并进行 URL 编码）
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const encodedSymbol = encodeURIComponent(token.symbol.toLowerCase());
    const link = `${baseUrl}/tokens/${encodedSymbol}`;
    navigator.clipboard.writeText(link);
    setCopiedId(token.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  // 过滤代币
  const filteredTokens = tokens.filter(token => {
    if (activeTab === 'all') return true;
    return token.status === activeTab;
  });

  return (
    <AdminLayout title="代币管理">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-400">创建和管理代币</p>
          <Link
            href="/admin/tokens/create"
            className="px-4 py-2 bg-[#FF8C00] text-white rounded-lg hover:bg-[#FF8C00]/90 transition font-medium text-sm"
          >
            ✨ 创建代币
          </Link>
        </div>

        {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-white/10">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 border-b-2 transition ${
                activeTab === 'all' 
                  ? 'border-[#FF8C00] text-white' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              全部 ({tokens.length})
            </button>
            <button 
              onClick={() => setActiveTab('draft')}
              className={`px-4 py-2 border-b-2 transition ${
                activeTab === 'draft' 
                  ? 'border-[#FF8C00] text-white' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              待发布 ({tokens.filter(t => t.status === 'draft').length})
            </button>
            <button 
              onClick={() => setActiveTab('published')}
              className={`px-4 py-2 border-b-2 transition ${
                activeTab === 'published' 
                  ? 'border-[#FF8C00] text-white' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              已发布 ({tokens.filter(t => t.status === 'published').length})
            </button>
          </div>

          {/* Tokens List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-[#FF8C00] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/20 rounded-2xl">
              <div className="text-6xl mb-4">🪙</div>
              <h3 className="text-xl font-bold mb-2">
                {activeTab === 'all' ? '还没有代币' : activeTab === 'draft' ? '没有待发布的代币' : '没有已发布的代币'}
              </h3>
              <p className="text-gray-400 mb-6">
                {activeTab === 'all' ? '创建第一个代币开始' : ''}
              </p>
              {activeTab === 'all' && (
                <Link
                  href="/admin/tokens/create"
                  className="inline-block px-6 py-3 bg-[#FF8C00] text-white rounded-xl hover:bg-[#FF8C00]/90 transition"
                >
                  创建代币
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTokens.map((token) => (
              <div
                key={token.id}
                className="p-6 bg-white/5 border border-white/10 rounded-2xl"
              >
                <div className="flex items-start gap-4">
                  <Image
                    src={token.logo}
                    alt={token.name}
                    width={64}
                    height={64}
                    className="rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{token.symbol}</h3>
                      <span
                        className={`px-3 py-1 text-xs rounded-full ${
                          token.status === 'published'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {token.status === 'published' ? '已发布' : '待发布'}
                      </span>
                      <span className="px-2 py-1 bg-[#FF8C00]/20 text-[#FF8C00] text-xs rounded">
                        {token.chain}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{token.name}</p>
                    <p className="text-gray-300 text-sm mb-4">{token.description}</p>
                    
                    {token.contract_address && (
                      <div className="mb-4">
                        <span className="text-xs text-gray-500">合约地址: </span>
                        <code className="text-xs text-[#00E5FF] font-mono">
                          {token.contract_address}
                        </code>
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => copyTokenLink(token)}
                        className={`text-sm transition ${
                          copiedId === token.id 
                            ? 'text-green-400' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {copiedId === token.id ? '✓ 已复制链接' : '📋 复制链接'}
                      </button>
                      <Link
                        href={`/admin/tokens/edit/${token.id}`}
                        className="text-sm text-[#00E5FF] hover:underline"
                      >
                        编辑
                      </Link>
                      {token.status === 'draft' && (
                        <Link
                          href={`/admin/tokens/publish/${token.id}`}
                          className="text-sm text-green-400 hover:underline"
                        >
                          发布
                        </Link>
                      )}
                      <button
                        onClick={() => handleDelete(token.id)}
                        className="text-sm text-red-400 hover:underline"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
