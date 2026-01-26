"use client";

import { useState, useEffect } from "react";
import { useSidebar } from "@/components/imo/SidebarContext";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { Project, ProjectStatus } from "@/types/imo";
import { 
  listProjects,
  listLaunchingProjects,
  getClaimRequests,
  approveClaimRequest
} from "@/lib/api/imo";
import Link from "next/link";

// 管理员钱包地址白名单
const ADMIN_WALLETS = [
  "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", // 示例地址
  "0x1234567890abcdef1234567890abcdef12345678", // 示例 BSC 地址
];

interface ClaimRequest {
  id: string;
  projectId: string;
  proofType: string;
  proofUrl: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  project?: Project;
}

type TabType = "projects" | "launching" | "claims";

export default function IMOAdminPage() {
  const { sidebarWidth } = useSidebar();
  const { isConnected, address } = useWallet();
  const [activeTab, setActiveTab] = useState<TabType>("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [launchingProjects, setLaunchingProjects] = useState<Project[]>([]);
  const [claimRequests, setClaimRequests] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = isConnected && address && ADMIN_WALLETS.includes(address);

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
      }
    } finally {
      setActionLoading(null);
    }
  }

  // 未连接钱包或非管理员
  if (!isConnected) {
    return (
      <main
        className="min-h-screen bg-[#0A0A0A] text-white p-8 transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="text-3xl font-bold mb-4">IMO 管理后台</h1>
          <p className="text-gray-400 mb-8">请先连接钱包以访问管理功能</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main
        className="min-h-screen bg-[#0A0A0A] text-white p-8 transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="text-3xl font-bold mb-4">访问被拒绝</h1>
          <p className="text-gray-400 mb-8">您的钱包地址没有管理员权限</p>
          <p className="text-sm text-gray-600 font-mono">{address}</p>
        </div>
      </main>
    );
  }

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: "projects", label: "所有项目", count: projects.length },
    { id: "launching", label: "发射中", count: launchingProjects.length },
    { id: "claims", label: "认领请求", count: claimRequests.length },
  ];

  return (
    <main
      className="min-h-screen bg-[#0A0A0A] text-white p-8 transition-all duration-300"
      style={{ marginLeft: sidebarWidth }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">IMO 管理后台</h1>
            <p className="text-gray-400 mt-1">管理项目、竞拍和认领请求</p>
          </div>
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
                            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg">
                              {project.logo || "🚀"}
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
                            {project.chain.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={project.status} />
                        </td>
                        <td className="px-4 py-4 text-[#10B981] font-medium">
                          ${project.firstBuyAmount || 0}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
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
                      <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center text-3xl">
                        {project.logo || "🚀"}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{project.name}</h3>
                        <p className="text-gray-500">${project.ticker}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">伯乐首单</p>
                        <p className="text-lg font-bold text-[#10B981]">
                          ${project.firstBuyAmount || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">伯乐</p>
                        <p className="text-sm font-mono text-white truncate">
                          {project.scoutWallet}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/launch/${project.id}`}
                      className="block w-full px-4 py-3 bg-[#FF8C00] text-black font-bold rounded-lg text-center hover:bg-[#FFAD33] transition"
                    >
                      发射代币
                    </Link>
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
                  <select
                    onChange={(e) => loadClaimRequests(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="">选择项目...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (${p.ticker})
                      </option>
                    ))}
                  </select>
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
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const config: Record<ProjectStatus, { label: string; color: string }> = {
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
