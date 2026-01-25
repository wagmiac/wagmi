"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Image from "next/image";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

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

export default function EditTokenPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState<Token | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [tokenId, setTokenId] = useState<string>("");
  
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    description: "",
    website: "",
    twitter: "",
    telegram: "",
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
      if (data.success && data.data) {
        setToken(data.data);
        setFormData({
          name: data.data.name,
          symbol: data.data.symbol,
          description: data.data.description,
          website: data.data.website || '',
          twitter: data.data.twitter || '',
          telegram: data.data.telegram || '',
          contract_address: data.data.contract_address || '',
          chain: data.data.chain || 'Solana',
        });
      } else {
        setToken(null);
      }
    } catch (error) {
      console.error('Failed to fetch token:', error);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const [logoFile, setLogoFile] = useState<File | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.symbol) {
      alert('请填写必填字段');
      return;
    }

    setSubmitting(true);
    try {
      let logoUrl = token?.logo;

      // Upload new logo if changed
      if (logoFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', logoFile);
        
        const uploadRes = await fetch('/api/admin/tokens/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: uploadFormData,
        });
        
        if (!uploadRes.ok) throw new Error('Failed to upload logo');
        const uploadData = await uploadRes.json();
        logoUrl = uploadData.data.url;
      }

      // Update token
      const res = await fetch(`/api/admin/tokens/${tokenId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...formData,
          logo: logoUrl,
        }),
      });

      if (!res.ok) throw new Error('Failed to update token');
      
      alert('代币信息已更新');
      router.push('/admin/tokens');
    } catch (error) {
      console.error('Failed to update token:', error);
      alert('更新失败');
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
            <h1 className="text-3xl font-bold mb-2">编辑代币</h1>
            <p className="text-gray-400">更新代币信息</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Logo Upload */}
            <div>
            <label className="block text-sm font-medium mb-2">代币图标</label>
            <div className="flex items-start gap-4">
              {(logoPreview || token.logo) ? (
                <Image
                  src={logoPreview || token.logo}
                  alt="Logo preview"
                  width={100}
                  height={100}
                  className="rounded-full border-2 border-white/20"
                />
              ) : (
                <div className="w-[100px] h-[100px] rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-gray-500">
                  🖼️
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white/10 file:text-white hover:file:bg-white/20 file:cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-2">
                  上传新图片以替换现有图标
                </p>
              </div>
            </div>
          </div>

          {/* Token Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              代币全称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#FF8C00] text-white"
              required
            />
          </div>

          {/* Token Symbol */}
          <div>
            <label className="block text-sm font-medium mb-2">
              代币简称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#FF8C00] text-white uppercase"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              描述 <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#FF8C00] text-white resize-none"
              required
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium mb-2">网站</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#FF8C00] text-white"
            />
          </div>

          {/* Twitter */}
          <div>
            <label className="block text-sm font-medium mb-2">Twitter</label>
            <input
              type="text"
              value={formData.twitter}
              onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#FF8C00] text-white"
            />
          </div>

          {/* Telegram */}
          <div>
            <label className="block text-sm font-medium mb-2">Telegram</label>
            <input
              type="text"
              value={formData.telegram}
              onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#FF8C00] text-white"
            />
          </div>

          {/* Contract Info (Read-only if published) */}
          {token.status === 'published' && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">公链</span>
                  <p className="text-white font-medium mt-1">{token.chain}</p>
                </div>
                <div>
                  <span className="text-gray-400">合约地址</span>
                  <p className="text-[#00E5FF] font-mono text-xs mt-1 break-all">
                    {token.contract_address}
                  </p>
                </div>
              </div>
            </div>
          )}

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
              className="flex-1 px-6 py-3 bg-[#FF8C00] text-white rounded-xl hover:bg-[#FF8C00]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '保存中...' : '保存修改'}
            </button>
          </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
