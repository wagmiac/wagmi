"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sidebar, ProjectCard, useSidebar } from "@/components/imo";
import { useWallet } from "@/lib/wallet/MultiWalletProvider";
import { getUserRevenue, getUserProjects } from "@/lib/api/imo";
import { Project } from "@/types/imo";
import { useAuth, isAdmin } from "@/lib/auth-context";

type Tab = "discovered" | "launched" | "revenue";

interface RevenueRecord {
  id: string;
  projectId: string;
  amount: number;
  currency: string;
  recipientType: string;
  txHash: string;
  createdAt: string;
}

interface RevenueData {
  records: RevenueRecord[];
  totalSOL: number;
  totalBNB: number;
}

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "discovered", label: "我发掘的", icon: "🔍" },
  { id: "launched", label: "已发射项目", icon: "🚀" },
  { id: "revenue", label: "收益明细", icon: "📈" },
];

export default function MyPage() {
  const [activeTab, setActiveTab] = useState<Tab>("discovered");
  const { address, primaryAddress, allAddresses, isConnected, connect, chain } = useWallet();
  const { user } = useAuth();
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [scoutedProjects, setScoutedProjects] = useState<Project[]>([]);
  const [launchedProjects, setLaunchedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const { sidebarWidth } = useSidebar();

  // 加载用户数据 - 使用主钱包地址查询
  useEffect(() => {
    if (!isConnected || !primaryAddress) return;

    async function loadUserData() {
      setLoading(true);
      try {
        // 使用主钱包地址查询，同时传递所有绑定的钱包地址
        const [scoutedRes, launchedRes] = await Promise.all([
          getUserProjects(primaryAddress!, "scouted", allAddresses),
          getUserProjects(primaryAddress!, "launched", allAddresses),
        ]);

        if (scoutedRes.success && scoutedRes.data) {
          setScoutedProjects(scoutedRes.data as Project[]);
        }
        if (launchedRes.success && launchedRes.data) {
          setLaunchedProjects(launchedRes.data as Project[]);
        }
      } catch (error) {
        console.error("Failed to load user data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, [isConnected, primaryAddress]);

  // 加载收益数据
  useEffect(() => {
    if (!isConnected || !primaryAddress || activeTab !== "revenue") return;

    setLoading(true);
    getUserRevenue(primaryAddress)
      .then((res) => {
        if (res.success && res.data) {
          setRevenueData(res.data as RevenueData);
        }
      })
      .finally(() => setLoading(false));
  }, [isConnected, primaryAddress, activeTab]);

  // 直接使用后端数据，不再 fallback 到 mock
  const myDiscoveredProjects = scoutedProjects;

  const myLaunchedProjects = launchedProjects;

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main 
        className="flex-1 transition-all duration-300 pb-20 md:pb-0 pt-16 md:pt-0"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Header */}
        <header className="sticky top-0 md:top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10 px-4 md:px-6 py-3 md:py-4">
          <h1 className="text-lg md:text-xl font-bold text-white">我的</h1>
        </header>

        {/* Content */}
        <div className="p-4 md:p-6">
          {/* User Stats */}
          <div className="bg-[#111111] border border-white/10 rounded-xl p-4 md:p-6 mb-4 md:mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4 md:mb-6">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#FF8C00]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl md:text-3xl">👤</span>
              </div>
              <div className="flex-1">
                <p className="text-gray-400 text-xs md:text-sm mb-1">钱包地址</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-mono text-sm md:text-base text-white">
                    {isConnected && address
                      ? `${address.slice(0, 6)}...${address.slice(-4)}`
                      : "未连接"}
                  </p>
                  {isConnected && chain && (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      chain === "solana" 
                        ? "bg-gradient-to-r from-[#9945FF]/20 to-[#14F195]/20 text-[#14F195]"
                        : "bg-[#F0B90B]/20 text-[#F0B90B]"
                    }`}>
                      {chain === "solana" ? "Solana" : "BSC"}
                    </span>
                  )}
                </div>
              </div>
              {/* 管理员入口 */}
              {isAdmin(user) && (
                <Link
                  href="/admin"
                  className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-500 transition flex items-center gap-2 justify-center"
                >
                  <span>🎛️</span>
                  <span>管理后台</span>
                </Link>
              )}
              {!isConnected && (
                <button
                  onClick={() => connect("phantom")}
                  className="w-full sm:w-auto sm:ml-auto px-4 py-2 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition"
                >
                  连接钱包
                </button>
              )}
              {loading && (
                <div className="sm:ml-auto flex items-center gap-2 text-gray-400">
                  <div className="animate-spin w-4 h-4 border-2 border-[#FF8C00] border-t-transparent rounded-full" />
                  <span className="text-sm">加载中...</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              <div className="bg-white/5 rounded-lg p-3 md:p-4 hover:bg-white/10 transition cursor-pointer active:scale-95" onClick={() => setActiveTab("discovered")}>
                <p className="text-gray-400 text-xs md:text-sm mb-1">发掘项目</p>
                <p className="text-xl md:text-2xl font-bold text-white">{myDiscoveredProjects.length}</p>
                <p className="text-xs text-gray-500">已提交</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 md:p-4 hover:bg-white/10 transition cursor-pointer active:scale-95" onClick={() => setActiveTab("launched")}>
                <p className="text-gray-400 text-xs md:text-sm mb-1">已发射</p>
                <p className="text-xl md:text-2xl font-bold text-white">{myLaunchedProjects.length}</p>
                <p className="text-xs text-[#10B981]">成功发射</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 md:p-4 hover:bg-white/10 transition cursor-pointer active:scale-95" onClick={() => setActiveTab("revenue")}>
                <p className="text-gray-400 text-xs md:text-sm mb-1">总收益</p>
                <p className="text-xl md:text-2xl font-bold text-[#10B981]">
                  {revenueData ? `${revenueData.totalSOL.toFixed(4)} SOL` : "0 SOL"}
                </p>
                {revenueData && revenueData.totalBNB > 0 && (
                  <p className="text-xs text-[#F0B90B]">+ {revenueData.totalBNB.toFixed(4)} BNB</p>
                )}
              </div>
            </div>
          </div>

          {/* Tabs - Horizontal scrollable on mobile */}
          <div className="flex items-center gap-1 md:gap-2 mb-4 md:mb-6 border-b border-white/10 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 border-b-2 transition whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? "border-[#FF8C00] text-white"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                <span className="text-sm md:text-base">{tab.icon}</span>
                <span className="text-sm md:text-base">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "discovered" && (
            <div>
              {myDiscoveredProjects.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {myDiscoveredProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 md:py-16">
                  <div className="text-5xl md:text-6xl mb-4">🔍</div>
                  <p className="text-gray-400 mb-4">还没有发掘过项目</p>
                  <Link
                    href="/submit"
                    className="inline-flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition"
                  >
                    发掘第一个项目
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === "launched" && (
            <div>
              {myLaunchedProjects.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {myLaunchedProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 md:py-16">
                  <div className="text-5xl md:text-6xl mb-4">🚀</div>
                  <p className="text-gray-400">还没有发射过项目</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "revenue" && (
            <div className="bg-[#111111] border border-white/10 rounded-xl p-4 md:p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-[#FF8C00] border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-400">加载中...</p>
                </div>
              ) : revenueData && revenueData.records.length > 0 ? (
                <div>
                  {/* 总收益汇总 */}
                  <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
                    <div className="bg-white/5 rounded-lg p-3 md:p-4">
                      <p className="text-gray-400 text-xs md:text-sm mb-1">SOL 总收益</p>
                      <p className="text-xl md:text-2xl font-bold text-[#10B981]">
                        {revenueData.totalSOL.toFixed(4)} SOL
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 md:p-4">
                      <p className="text-gray-400 text-xs md:text-sm mb-1">BNB 总收益</p>
                      <p className="text-xl md:text-2xl font-bold text-[#FBBF24]">
                        {revenueData.totalBNB.toFixed(4)} BNB
                      </p>
                    </div>
                  </div>

                  {/* 收益记录列表 */}
                  <div className="space-y-2 md:space-y-3">
                    {revenueData.records.map((record) => (
                      <div
                        key={record.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between bg-white/5 rounded-lg p-3 md:p-4 gap-2"
                      >
                        <div>
                          <p className="text-white font-medium text-sm md:text-base">
                            {record.recipientType === "creator" && "创作者分成"}
                            {record.recipientType === "scout" && "伯乐分成"}
                          </p>
                          <p className="text-xs md:text-sm text-gray-400">
                            {new Date(record.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="sm:text-right">
                          <p className="text-[#10B981] font-bold text-sm md:text-base">
                            +{record.amount.toFixed(4)} {record.currency}
                          </p>
                          {record.txHash && (
                            <a
                              href={`https://solscan.io/tx/${record.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#00E5FF] hover:underline"
                            >
                              查看交易
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-5xl md:text-6xl mb-4">📈</div>
                  <p className="text-gray-400 mb-2">暂无收益记录</p>
                  <p className="text-xs md:text-sm text-gray-500">
                    发掘项目成功发射后，您将获得 10% 的持续分成
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
