"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Image from "next/image";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useToast } from "@/components/ui/Toast";

export default function CreateTokenPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");
  
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    description: "",
    website: "",
    twitter: "",
    telegram: "",
  });

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
    
    if (!formData.name || !formData.symbol || !logoFile) {
      toast.warning('请填写必填字段');
      return;
    }

    setLoading(true);
    try {
      // Upload logo first
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
      const logoUrl = uploadData.data.url;

      // Create token
      const res = await fetch('/api/admin/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...formData,
          logo: logoUrl,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.error === 'Symbol already exists') {
          toast.error('创建失败：代币符号 (Symbol) 已存在，请使用其他符号');
          return;
        }
        throw new Error(errorData.error || 'Failed to create token');
      }
      
      toast.success('代币创建成功！状态：待发布');
      router.push('/admin/tokens');
    } catch (error) {
      console.error('Failed to create token:', error);
      toast.error('创建失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
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
          <h1 className="text-3xl font-bold mb-2">创建代币</h1>
          <p className="text-gray-400">填写代币基本信息，创建后将进入待发布状态</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              代币图标 <span className="text-red-400">*</span>
            </label>
            <div className="flex items-start gap-4">
              {logoPreview ? (
                <Image
                  src={logoPreview}
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
                  推荐尺寸：500x500px，支持 PNG、JPG、GIF
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
              placeholder="例如：Wagmi Token"
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
              placeholder="例如：WAGMI"
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
              placeholder="简要描述这个代币的用途和特点..."
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
              placeholder="https://"
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
              placeholder="@username 或完整链接"
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
              placeholder="@username 或完整链接"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#FF8C00] text-white"
            />
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <div className="flex gap-3">
              <span className="text-2xl">ℹ️</span>
              <div className="flex-1 text-sm">
                <p className="text-blue-400 font-medium mb-1">提示</p>
                <p className="text-gray-300">
                  创建后代币将进入<strong>待发布</strong>状态。你需要先在发射台发射代币，然后补充合约地址和公链信息，最后点击发布才能在前端显示。
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
              disabled={loading}
              className="flex-1 px-6 py-3 bg-[#FF8C00] text-white rounded-xl hover:bg-[#FF8C00]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '创建中...' : '创建代币'}
            </button>
          </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
