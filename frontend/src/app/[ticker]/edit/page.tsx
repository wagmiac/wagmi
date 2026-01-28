"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getProjectByTicker, updateProject, uploadProjectLogo, getIMOToken } from "@/lib/api/imo";
import { useMultiWallet } from "@/lib/wallet/MultiWalletProvider";
import { Project } from "@/types/imo";
import { Sidebar, useSidebar } from "@/components/imo";

interface FormData {
  name: string;
  logo: string;
  description: string;
  website: string;
  twitter: string;
  github: string;
  productHunt: string;
  discord: string;
  reddit: string;
}

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = (params.ticker as string).toUpperCase();
  const { wallets } = useMultiWallet();
  const { sidebarWidth } = useSidebar();
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    name: "",
    logo: "",
    description: "",
    website: "",
    twitter: "",
    github: "",
    productHunt: "",
    discord: "",
    reddit: "",
  });

  // 获取当前连接的钱包地址
  const connectedWallets = wallets
    .filter((w) => w.address)
    .map((w) => w.address.toLowerCase());

  // 加载项目数据
  useEffect(() => {
    async function loadProject() {
      try {
        const res = await getProjectByTicker(ticker);
        if (res.success && res.data) {
          const p = res.data as Project;
          setProject(p);
          setFormData({
            name: p.name || "",
            logo: p.logo || "",
            description: p.description || "",
            website: p.website || "",
            twitter: p.twitter || "",
            github: p.github || "",
            productHunt: p.product_hunt || "",
            discord: p.discord || "",
            reddit: p.reddit || "",
          });
          
          // 检查编辑权限：伯乐或创作者
          const scoutWallet = p.scout_wallet?.toLowerCase();
          const creatorWallet = p.creator_wallet?.toLowerCase();
          const hasPermission = connectedWallets.some(
            (w) => w === scoutWallet || w === creatorWallet
          );
          setCanEdit(hasPermission);
        } else {
          setError("项目不存在");
        }
      } catch {
        setError("加载项目失败");
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 处理 Logo 上传
  const handleLogoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("请上传 PNG、JPG、GIF 或 WebP 格式的图片");
      return;
    }

    // 验证文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      setError("图片大小不能超过 5MB");
      return;
    }

    setUploadingLogo(true);
    setError(null);

    try {
      const res = await uploadProjectLogo(file);
      if (res.success && res.data?.url) {
        setFormData((prev) => ({ ...prev, logo: res.data!.url }));
      } else {
        throw new Error(res.error || "上传失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploadingLogo(false);
    }
  }, []);

  const handleLogoClear = () => {
    setFormData((prev) => ({ ...prev, logo: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !canEdit) return;

    // 检查是否已登录
    const token = getIMOToken();
    if (!token) {
      setError("请先连接钱包并完成认证");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await updateProject(project.id, {
        name: formData.name || undefined,
        logo: formData.logo || undefined,
        description: formData.description || undefined,
        website: formData.website || undefined,
        twitter: formData.twitter || undefined,
        github: formData.github || undefined,
        productHunt: formData.productHunt || undefined,
        discord: formData.discord || undefined,
        reddit: formData.reddit || undefined,
      });

      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/${ticker}`);
        }, 1500);
      } else {
        throw new Error(res.error || "保存失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#0a0a0a]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center" style={{ marginLeft: sidebarWidth }}>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FF8C00]"></div>
        </main>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="flex min-h-screen bg-[#0a0a0a]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center" style={{ marginLeft: sidebarWidth }}>
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <Link href="/" className="text-[#FF8C00] hover:underline">
              返回首页
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="flex min-h-screen bg-[#0a0a0a]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center" style={{ marginLeft: sidebarWidth }}>
          <div className="text-center">
            <p className="text-red-400 mb-4">您没有权限编辑此项目</p>
            <p className="text-gray-500 text-sm mb-4">只有伯乐或创作者可以编辑项目信息</p>
            <Link href={`/${ticker}`} className="text-[#FF8C00] hover:underline">
              返回项目详情
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <main className="flex-1 transition-all duration-300" style={{ marginLeft: sidebarWidth }}>
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/${ticker}`}
              className="text-gray-400 hover:text-white transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              返回
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <span className="text-white font-bold">编辑项目</span>
            <span className="text-[#FF8C00] font-mono">${ticker}</span>
          </div>
        </header>

        {/* Content */}
        <div className="p-6 max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Logo */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">项目 Logo</label>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-xl bg-white/5 overflow-hidden border border-white/10">
                  {formData.logo ? (
                    <Image
                      src={formData.logo}
                      alt="Logo"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-gray-500">
                      🚀
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 cursor-pointer transition">
                    {uploadingLogo ? "上传中..." : "更换图片"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/webp"
                      onChange={handleLogoSelect}
                      className="hidden"
                      disabled={uploadingLogo}
                    />
                  </label>
                  {formData.logo && (
                    <button
                      type="button"
                      onClick={handleLogoClear}
                      className="text-xs text-gray-500 hover:text-red-400"
                    >
                      移除图片
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">项目名称</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">项目描述</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/500 字符
              </p>
            </div>

            {/* Media Links */}
            <div>
              <h2 className="text-lg font-bold mb-4">媒体链接</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">官网</label>
                  <input
                    type="text"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Twitter / X</label>
                  <input
                    type="text"
                    name="twitter"
                    value={formData.twitter}
                    onChange={handleChange}
                    placeholder="https://twitter.com/..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">GitHub</label>
                  <input
                    type="text"
                    name="github"
                    value={formData.github}
                    onChange={handleChange}
                    placeholder="https://github.com/..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Product Hunt</label>
                  <input
                    type="text"
                    name="productHunt"
                    value={formData.productHunt}
                    onChange={handleChange}
                    placeholder="https://www.producthunt.com/products/..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Discord</label>
                  <input
                    type="text"
                    name="discord"
                    value={formData.discord}
                    onChange={handleChange}
                    placeholder="https://discord.gg/..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Reddit</label>
                  <input
                    type="text"
                    name="reddit"
                    value={formData.reddit}
                    onChange={handleChange}
                    placeholder="https://reddit.com/r/..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50"
                  />
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                保存成功！正在跳转...
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <Link
                href={`/${ticker}`}
                className="flex-1 px-6 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-lg hover:bg-white/10 transition text-center"
              >
                取消
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "保存中..." : "保存修改"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
