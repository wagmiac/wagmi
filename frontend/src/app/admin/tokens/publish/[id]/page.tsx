"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Image from "next/image";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
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
}

export default function PublishTokenPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState<Token | null>(null);
  const [tokenId, setTokenId] = useState<string>("");
  
  const [formData, setFormData] = useState({
    contract_address: "",
    chain: "Solana",
  });

  useEffect(() => {
    const initParams = async () => {
      const resolvedParams = await Promise.resolve(params);
      setTokenId(resolvedParams.id);
    };
    initParams();
  }, [params]);

  useEffect(() => {
    if (!tokenId) return;
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }
    fetchToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, tokenId]);

  const fetchToken = async () => {
    if (!tokenId) return;
    try {
      const res = await fetch(`/api/admin/tokens/${tokenId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!res.ok) {
        setToken(null);
        return;
      }
      const data = await res.json();
      setToken(data.success ? data.data : null);
    } catch (error) {
      console.error('Failed to fetch token:', error);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.contract_address) {
      toast.warning('请输入合约地址');
      return;
    }

    if (!confirm('确定要发布这个代币吗？发布后将在前端可见。')) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/tokens/${tokenId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      
      if (!res.ok) {
        console.error('Publish failed:', data);
        throw new Error(data.error || 'Failed to publish token');
      }
      
      toast.success('代币发布成功！');
      router.push('/admin/tokens');
    } catch (error) {
      console.error('Failed to publish token:', error);
      toast.error('发布失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || user.role !== 'admin' || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#FF8C00] border-t-transparent rounded-full animate-spin"></div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-gray-400">代币不存在</p>
            <button
              onClick={() => router.push('/admin/tokens')}
              className="mt-4 px-4 py-2 bg-[#FF8C00] text-white rounded-lg"
            >
              返回列表
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navigation />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
          >
            ← 返回
          </button>
          <h1 className="text-3xl font-bold mb-2">发布代币</h1>
          <p className="text-gray-400">补充合约地址和公链信息后发布</p>
        </div>

        {/* Token Info */}
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Image src={token.logo} alt={token.name} width={64} height={64} className="rounded-full" />
            <div>
              <h2 className="text-2xl font-bold">{token.symbol}</h2>
              <p className="text-gray-400">{token.name}</p>
            </div>
          </div>
          <p className="text-gray-300">{token.description}</p>
        </div>

        {/* Workflow Steps */}
        <div className="mb-8 p-6 bg-gradient-to-br from-[#FF8C00]/10 to-[#00E5FF]/10 border border-[#FF8C00]/30 rounded-2xl">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span>🚀</span> 发布流程
          </h3>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs">✓</span>
              <div>
                <strong>1. 创建代币信息</strong>
                <p className="text-gray-400">已完成</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FF8C00]/20 text-[#FF8C00] flex items-center justify-center text-xs">2</span>
              <div>
                <strong>2. 在发射台发射代币</strong>
                <p className="text-gray-400">前往 pump.fun 或其他发射台创建代币</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FF8C00]/20 text-[#FF8C00] flex items-center justify-center text-xs">3</span>
              <div>
                <strong>3. 复制合约地址</strong>
                <p className="text-gray-400">发射成功后复制代币的合约地址</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center text-xs">4</span>
              <div>
                <strong>4. 填写并发布</strong>
                <p className="text-gray-400">在下方填写信息后点击发布</p>
              </div>
            </li>
          </ol>
        </div>

        {/* Form */}
        <form onSubmit={handlePublish} className="space-y-6">
          {/* Chain Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              选择公链 <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['Solana', 'Ethereum', 'BSC', 'Polygon', 'Arbitrum', 'Base'].map((chain) => (
                <button
                  key={chain}
                  type="button"
                  onClick={() => setFormData({ ...formData, chain })}
                  className={`px-4 py-3 rounded-xl border-2 transition ${
                    formData.chain === chain
                      ? 'border-[#FF8C00] bg-[#FF8C00]/10 text-white'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/30'
                  }`}
                >
                  {chain}
                </button>
              ))}
            </div>
          </div>

          {/* Contract Address */}
          <div>
            <label className="block text-sm font-medium mb-2">
              合约地址 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.contract_address}
              onChange={(e) => setFormData({ ...formData, contract_address: e.target.value })}
              placeholder={`输入 ${formData.chain} 链上的合约地址`}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#FF8C00] text-white font-mono text-sm"
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              请确保合约地址正确，发布后将无法修改
            </p>
          </div>

          {/* Warning */}
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <div className="flex gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1 text-sm">
                <p className="text-yellow-400 font-medium mb-1">注意</p>
                <p className="text-gray-300">
                  发布后代币将在前端公开展示。请确保已经在发射台成功发射，并且合约地址填写正确。
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] text-white rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {submitting ? '发布中...' : '🚀 发布代币'}
            </button>
          </div>
        </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}