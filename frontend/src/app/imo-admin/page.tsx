"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/lib/wallet/MultiWalletProvider";
import { useAuth, isAdmin as checkIsAdmin } from "@/lib/auth-context";
import AdminLayout from "@/components/admin/AdminLayout";
import { Project, ProjectStatus, LAUNCHPAD_CONFIG } from "@/types/imo";
import { 
  listProjects,
  listLaunchingProjects,
  getClaimRequests,
  approveClaimRequest,
  updateProject,
  evaluateProject,
  getDevWallet,
  exportDevWalletKey,
} from "@/lib/api/imo";
import Link from "next/link";
import Dropdown from "@/components/ui/Dropdown";
import { useToast } from "@/components/ui/Toast";

interface ClaimRequest {
  id: string;
  projectId: string;
  proofType: string;
  proofUrl: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  project?: Project;
}

interface WalletInfo {
  address: string;
  launchpad: string;
}

type TabType = "projects" | "launching" | "claims";

export default function IMOAdminPage() {
  const { isConnected, address } = useWallet();
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [launchingProjects, setLaunchingProjects] = useState<Project[]>([]);
  const [claimRequests, setClaimRequests] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // 编辑模态框
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    twitter: "",
    github: "",
    website: "",
    discord: "",
    reddit: "",
  });
  
  // 钱包查看模态框
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletProject, setWalletProject] = useState<Project | null>(null);
  const [wallets, setWallets] = useState<Record<string, WalletInfo>>({});
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [exportedKeys, setExportedKeys] = useState<Record<string, string>>({});

  // 使用 auth-context 的管理员检查
  const isAdmin = checkIsAdmin(user);

  // 加载数据
  useEffect(() => {
    if (!isAdmin) return;

    async function loadData() {
      setLoading(true);
      try {
        const [projectsRes, launchingRes] = await Promise.all([
          listProjects({ limit: 100 }),
          listLaunchingProjects(),
        ]);

        if (projectsRes.success && projectsRes.data) {
          setProjects(projectsRes.data as Project[]);
        }
        if (launchingRes.success && launchingRes.data) {
          setLaunchingProjects(launchingRes.data as Project[]);
        }
      } catch (error) {
        console.error("Failed to load admin data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isAdmin]);

  // 加载认领请求
  async function loadClaimRequests(projectId: string) {
    const res = await getClaimRequests(projectId);
    if (res.success && res.data) {
      setClaimRequests(res.data as ClaimRequest[]);
    }
  }

  // 批准认领
  async function handleApproveClaim(claimId: string) {
    setActionLoading(claimId);
    try {
      const res = await approveClaimRequest(claimId);
      if (res.success) {
        setClaimRequests((prev) =>
          prev.map((c) =>
            c.id === claimId ? { ...c, status: "approved" as const } : c
          )
        );
        toast.success("认领已批准");
      }
    } finally {
      setActionLoading(null);
    }
  }
  
  // 打开编辑模态框
  function openEditModal(project: Project) {
    setEditingProject(project);
    setEditForm({
      name: project.name || "",
      description: project.description || "",
      twitter: project.twitter || "",
      github: project.github || "",
      website: project.website || "",
      discord: project.discord || "",
      reddit: project.reddit || "",
    });
    setEditModalOpen(true);
  }
  
  // 保存编辑
  async function handleSaveEdit() {
    if (!editingProject) return;
    setActionLoading(editingProject.id);
    try {
      const res = await updateProject(editingProject.id, editForm);
      if (res.success) {
        setProjects(prev => prev.map(p => 
          p.id === editingProject.id ? { ...p, ...editForm } : p
        ));
        setEditModalOpen(false);
        toast.success("项目已更新");
      } else {
        toast.error(res.error || "更新失败");
      }
    } catch {
      toast.error("更新失败");
    } finally {
      setActionLoading(null);
    }
  }
  
  // 触发 AI 评估
  async function handleEvaluate(projectId: string) {
    setActionLoading(`evaluate-${projectId}`);
    try {
      const res = await evaluateProject(projectId);
      if (res.success) {
        toast.success("AI 评估已开始，请稍后刷新查看结果");
        setProjects(prev => prev.map(p => 
          p.id === projectId ? { ...p, is_evaluating: true } : p
        ));
      } else {
        toast.error(res.error || "评估请求失败");
      }
    } catch {
      toast.error("评估请求失败");
    } finally {
      setActionLoading(null);
    }
  }
  
  // 打开钱包查看模态框
  async function openWalletModal(project: Project) {
    setWalletProject(project);
    setWallets({});
    setExportedKeys({});
    setWalletModalOpen(true);
    setLoadingWallets(true);
    
    try {
      const res = await getDevWallet(project.id);
      if (res.success && res.data) {
        setWallets(res.data as Record<string, WalletInfo>);
      }
    } catch (error) {
      console.error("Failed to load wallets:", error);
    } finally {
      setLoadingWallets(false);
    }
  }
  
  // 导出私钥
  async function handleExportKey(projectId: string, launchpad: string) {
    if (!confirm(`确定要导出 ${launchpad} 的私钥吗？请妥善保管，不要泄露！`)) {
      return;
    }
    
    setExportingKey(launchpad);
    try {
      const res = await exportDevWalletKey(projectId, launchpad);
      if (res.success && res.data) {
        setExportedKeys(prev => ({
          ...prev,
          [launchpad]: (res.data as { privateKey: string }).privateKey,
        }));
        toast.success("私钥已导出");
      } else {
        toast.error(res.error || "导出失败");
      }
    } catch {
      toast.error("导出失败");
    } finally {
      setExportingKey(null);
    }
  }
  
  // 复制私钥
  function copyPrivateKey(key: string) {
    navigator.clipboard.writeText(key);
    toast.success("私钥已复制到剪贴板");
  }

  // 未连接钱包或非管理员
  if (!isConnected) {
    return (
      <AdminLayout title="IMO 管理">
        <div className="text-center py-20">
          <h1 className="text-3xl font-bold mb-4">IMO 管理后台</h1>
          <p className="text-gray-400 mb-8">请先连接钱包以访问管理功能</p>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout title="IMO 管理">
        <div className="text-center py-20">
          <h1 className="text-3xl font-bold mb-4">访问被拒绝</h1>
          <p className="text-gray-400 mb-4">您没有管理员权限</p>
          {!user && (
            <p className="text-sm text-gray-500 mb-4">请先登录账号</p>
          )}
          {user && (
            <p className="text-sm text-gray-600">当前账号: {user.nickname || user.email || '未知'}</p>
          )}
        </div>
      </AdminLayout>
    );
  }

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: "projects", label: "所有项目", count: projects.length },
    { id: "launching", label: "发射中", count: launchingProjects.length },
    { id: "claims", label: "认领请求", count: claimRequests.length },
  ];

  return (
    <AdminLayout title="IMO 管理">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-gray-400">管理项目、竞拍和认领请求</p>
          <div className="text-sm text-gray-400 font-mono">{address}</div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-[#FF8C00] text-black"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === tab.id ? "bg-black/20" : "bg-white/10"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">加载中...</div>
        ) : (
          <>
            {/* Projects Tab */}
            {activeTab === "projects" && (
              <div className="bg-[#111111] border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">项目</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">链</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">状态</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">伯乐首单</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {projects.map((project) => (
                      <tr key={project.id} className="hover:bg-white/5 transition">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {project.logo ? (
                              <img 
                                src={project.logo.startsWith('http') ? project.logo : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${project.logo}`}
                                alt={project.name}
                                className="w-10 h-10 rounded-lg object-cover bg-white/10"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg ${project.logo ? 'hidden' : ''}`}>
                              🚀
                            </div>
                            <div>
                              <p className="font-medium text-white">{project.name}</p>
                              <p className="text-sm text-gray-500">${project.ticker}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`text-sm ${
                              project.chain === "solana" ? "text-purple-400" : "text-yellow-500"
                            }`}
                          >
                            {project.chain ? project.chain.toUpperCase() : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={project.status} />
                        </td>
                        <td className="px-4 py-4 text-[#10B981] font-medium">
                          {project.current_bid_amount || 0}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* 编辑 */}
                            <button
                              onClick={() => openEditModal(project)}
                              className="px-3 py-1.5 text-sm bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition"
                              title="编辑项目"
                            >
                              ✏️
                            </button>
                            {/* AI 评估 */}
                            <button
                              onClick={() => handleEvaluate(project.id)}
                              disabled={actionLoading === `evaluate-${project.id}` || project.is_evaluating}
                              className="px-3 py-1.5 text-sm bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition disabled:opacity-50"
                              title="AI 评估"
                            >
                              {actionLoading === `evaluate-${project.id}` || project.is_evaluating ? "⏳" : "🤖"}
                            </button>
                            {/* 钱包管理 */}
                            <button
                              onClick={() => openWalletModal(project)}
                              className="px-3 py-1.5 text-sm bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition"
                              title="查看钱包"
                            >
                              🔐
                            </button>
                            {project.status === "launching" && (
                              <Link
                                href={`/launch/${project.id}`}
                                className="px-3 py-1.5 text-sm bg-[#FF8C00]/20 text-[#FF8C00] rounded hover:bg-[#FF8C00]/30 transition"
                              >
                                发射
                              </Link>
                            )}
                            <Link
                              href={`/${project.ticker}`}
                              className="px-3 py-1.5 text-sm bg-white/10 text-gray-400 rounded hover:bg-white/20 hover:text-white transition"
                            >
                              查看
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Launching Tab */}
            {activeTab === "launching" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {launchingProjects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-[#111111] border border-[#FF8C00]/30 rounded-xl p-6"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      {project.logo ? (
                        <img 
                          src={project.logo.startsWith('http') ? project.logo : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${project.logo}`}
                          alt={project.name}
                          className="w-16 h-16 rounded-xl object-cover bg-white/10"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center text-3xl">
                          🚀
                        </div>
                      )}
                      <div>
                        <h3 className="text-xl font-bold text-white">{project.name}</h3>
                        <p className="text-gray-500">${project.ticker}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">当前出价</p>
                        <p className="text-lg font-bold text-[#10B981]">
                          {project.current_bid_amount || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">伯乐</p>
                        <p className="text-sm font-mono text-white truncate">
                          {project.scout_wallet || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(project)}
                        className="flex-1 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition"
                      >
                        ✏️ 编辑
                      </button>
                      <button
                        onClick={() => openWalletModal(project)}
                        className="flex-1 px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition"
                      >
                        🔐 钱包
                      </button>
                      <Link
                        href={`/launch/${project.id}`}
                        className="flex-1 px-4 py-2 bg-[#FF8C00] text-black font-bold rounded-lg text-center hover:bg-[#FFAD33] transition"
                      >
                        发射
                      </Link>
                    </div>
                  </div>
                ))}
                {launchingProjects.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    暂无发射中的项目
                  </div>
                )}
              </div>
            )}

            {/* Claims Tab */}
            {activeTab === "claims" && (
              <div className="space-y-4">
                {/* Project selector for loading claims */}
                <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
                  <label className="block text-sm text-gray-400 mb-2">选择项目加载认领请求</label>
                  <Dropdown
                    options={[
                      { value: "", label: "选择项目..." },
                      ...projects.map((p) => ({ value: p.id, label: `${p.name} ($${p.ticker})` }))
                    ]}
                    value=""
                    onChange={(value) => loadClaimRequests(value)}
                    size="md"
                  />
                </div>

                {/* Claim requests list */}
                {claimRequests.length > 0 ? (
                  <div className="bg-[#111111] border border-white/10 rounded-xl overflow-hidden">
                    {claimRequests.map((claim) => (
                      <div
                        key={claim.id}
                        className="p-4 border-b border-white/5 last:border-0 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-white">
                            认证类型: {claim.proofType}
                          </p>
                          <a
                            href={claim.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[#FF8C00] hover:underline"
                          >
                            {claim.proofUrl}
                          </a>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(claim.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {claim.status === "pending" ? (
                            <>
                              <button
                                onClick={() => handleApproveClaim(claim.id)}
                                disabled={actionLoading === claim.id}
                                className="px-3 py-1.5 text-sm bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition disabled:opacity-50"
                              >
                                {actionLoading === claim.id ? "..." : "批准"}
                              </button>
                              <button className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition">
                                拒绝
                              </button>
                            </>
                          ) : (
                            <span
                              className={`px-3 py-1.5 text-sm rounded ${
                                claim.status === "approved"
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {claim.status === "approved" ? "已批准" : "已拒绝"}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    请选择项目以查看认领请求
                  </div>
                )}
              </div>
            )}
          </>
        )}
        
        {/* 编辑项目模态框 */}
        {editModalOpen && editingProject && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">编辑项目</h2>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">项目名称</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#FF8C00]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">项目描述</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#FF8C00] resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Twitter</label>
                  <input
                    type="text"
                    value={editForm.twitter}
                    onChange={(e) => setEditForm({ ...editForm, twitter: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#FF8C00]"
                    placeholder="https://twitter.com/..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">GitHub</label>
                  <input
                    type="text"
                    value={editForm.github}
                    onChange={(e) => setEditForm({ ...editForm, github: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#FF8C00]"
                    placeholder="https://github.com/..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">官网</label>
                  <input
                    type="text"
                    value={editForm.website}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#FF8C00]"
                    placeholder="https://..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Discord</label>
                  <input
                    type="text"
                    value={editForm.discord}
                    onChange={(e) => setEditForm({ ...editForm, discord: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#FF8C00]"
                    placeholder="https://discord.gg/..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Reddit</label>
                  <input
                    type="text"
                    value={editForm.reddit}
                    onChange={(e) => setEditForm({ ...editForm, reddit: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#FF8C00]"
                    placeholder="https://reddit.com/r/..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-white/10 text-gray-400 rounded-lg hover:bg-white/20 transition"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={actionLoading === editingProject.id}
                  className="flex-1 px-4 py-2 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition disabled:opacity-50"
                >
                  {actionLoading === editingProject.id ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* 钱包查看模态框 */}
        {walletModalOpen && walletProject && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">发射台钱包</h2>
                <button
                  onClick={() => setWalletModalOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <p className="text-sm text-gray-400 mb-4">
                项目: {walletProject.name} (${walletProject.ticker})
              </p>
              
              {loadingWallets ? (
                <div className="text-center py-8 text-gray-400">加载中...</div>
              ) : Object.keys(wallets).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无生成的钱包
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(wallets).map(([pad, info]) => (
                    <div key={pad} className="bg-white/5 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[#FF8C00]">{pad}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          LAUNCHPAD_CONFIG[pad as keyof typeof LAUNCHPAD_CONFIG]?.chain === 'solana' 
                            ? 'bg-purple-500/20 text-purple-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {LAUNCHPAD_CONFIG[pad as keyof typeof LAUNCHPAD_CONFIG]?.chain?.toUpperCase() || '—'}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">钱包地址</p>
                        <p className="text-sm font-mono text-white break-all">
                          {typeof info === 'object' ? info.address : info}
                        </p>
                      </div>
                      
                      {exportedKeys[pad] ? (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <p className="text-xs text-red-400 mb-1">⚠️ 私钥（请妥善保管！）</p>
                          <p className="text-xs font-mono text-red-300 break-all mb-2">
                            {exportedKeys[pad]}
                          </p>
                          <button
                            onClick={() => copyPrivateKey(exportedKeys[pad])}
                            className="text-xs px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition"
                          >
                            📋 复制私钥
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleExportKey(walletProject.id, pad)}
                          disabled={exportingKey === pad}
                          className="w-full px-3 py-2 text-sm bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition disabled:opacity-50"
                        >
                          {exportingKey === pad ? "导出中..." : "🔓 导出私钥"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <button
                onClick={() => setWalletModalOpen(false)}
                className="w-full mt-6 px-4 py-2 bg-white/10 text-gray-400 rounded-lg hover:bg-white/20 transition"
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const config: Record<ProjectStatus, { label: string; color: string }> = {
    discovering: { label: "发掘中", color: "bg-purple-500/20 text-purple-400" },
    auctioning: { label: "竞拍中", color: "bg-yellow-500/20 text-yellow-400" },
    launching: { label: "发射中", color: "bg-[#FF8C00]/20 text-[#FF8C00]" },
    launched: { label: "已发射", color: "bg-green-500/20 text-green-400" },
    claimed: { label: "已认领", color: "bg-blue-500/20 text-blue-400" },
    failed: { label: "已失败", color: "bg-red-500/20 text-red-400" },
  };

  const { label, color } = config[status] || { label: status, color: "bg-gray-500/20 text-gray-400" };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>{label}</span>
  );
}
