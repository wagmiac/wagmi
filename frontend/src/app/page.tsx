"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Sidebar, ProjectCard, useSidebar } from "@/components/imo";
import { getProjects } from "@/lib/mock-data";
import { ProjectStatus, Chain } from "@/types/imo";

type FilterStatus = ProjectStatus | "all";
type FilterChain = Chain | "all";

const statusFilters: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "launching", label: "发射中" },
  { value: "launched", label: "已发射" },
  { value: "claimed", label: "已认领" },
];

const chainFilters: { value: FilterChain; label: string }[] = [
  { value: "all", label: "全部链" },
  { value: "solana", label: "Solana" },
  { value: "bsc", label: "BSC" },
];

type SortOption = "newest" | "oldest" | "firstbuy-high" | "firstbuy-low";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "newest", label: "最新发射" },
  { value: "oldest", label: "最早发射" },
  { value: "firstbuy-high", label: "首单最高" },
  { value: "firstbuy-low", label: "首单最低" },
];

function IMOHomeContent() {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [chainFilter, setChainFilter] = useState<FilterChain>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const { sidebarWidth } = useSidebar();
  
  // 获取所有项目并应用筛选
  const allProjects = getProjects({
    status: statusFilter !== "all" ? statusFilter : undefined,
    chain: chainFilter !== "all" ? chainFilter : undefined,
  });

  // 搜索和排序过滤
  const projects = useMemo(() => {
    let filtered = allProjects;
    
    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(project => 
        project.name.toLowerCase().includes(query) ||
        project.ticker.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
      );
    }
    
    // 排序
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.launchedAt || b.createdAt || 0).getTime() - new Date(a.launchedAt || a.createdAt || 0).getTime();
        case "oldest":
          return new Date(a.launchedAt || a.createdAt || 0).getTime() - new Date(b.launchedAt || b.createdAt || 0).getTime();
        case "firstbuy-high":
          return (b.firstBuyAmount || 0) - (a.firstBuyAmount || 0);
        case "firstbuy-low":
          return (a.firstBuyAmount || 0) - (b.firstBuyAmount || 0);
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [allProjects, searchQuery, sortBy]);

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
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-4">
            {/* Search Box */}
            <div className="relative flex-1 max-w-full md:max-w-md">
              <svg 
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索项目名称或代币符号..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF8C00]/50 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Status Filters - Hidden on mobile, shown in horizontal scroll */}
            <div className="flex items-center gap-3 md:gap-4 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                {statusFilters.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setStatusFilter(filter.value)}
                    className={`px-2 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition whitespace-nowrap ${
                      statusFilter === filter.value
                        ? "bg-[#FF8C00] text-black"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              
              {/* Chain Filter */}
              <div className="h-6 w-px bg-white/10 flex-shrink-0 hidden md:block" />
              <div className="flex items-center gap-1 flex-shrink-0">
                {chainFilters.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setChainFilter(filter.value)}
                    className={`px-2 md:px-3 py-1 md:py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                      chainFilter === filter.value
                        ? "bg-white/10 text-white"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              
              {/* Sort Dropdown */}
              <div className="h-6 w-px bg-white/10" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-xs font-medium text-gray-300 focus:outline-none focus:border-[#FF8C00]/50"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Discover Button */}
            <Link
              href="/submit"
              className="px-5 py-2.5 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition flex items-center gap-2 flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden md:inline">发掘项目</span>
              <span className="md:hidden">发掘</span>
            </Link>
          </div>
        </header>
        
        {/* Content */}
        <div className="p-4 md:p-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="bg-[#111111] border border-white/10 rounded-xl p-3 md:p-4">
              <p className="text-gray-400 text-xs md:text-sm mb-1">总项目数</p>
              <p className="text-xl md:text-2xl font-bold text-white">128</p>
            </div>
            <div className="bg-[#111111] border border-white/10 rounded-xl p-3 md:p-4">
              <p className="text-gray-400 text-xs md:text-sm mb-1">竞拍中</p>
              <p className="text-xl md:text-2xl font-bold text-[#FF8C00]">12</p>
            </div>
            <div className="bg-[#111111] border border-white/10 rounded-xl p-3 md:p-4">
              <p className="text-gray-400 text-xs md:text-sm mb-1">已发射</p>
              <p className="text-xl md:text-2xl font-bold text-[#10B981]">89</p>
            </div>
            <div className="bg-[#111111] border border-white/10 rounded-xl p-3 md:p-4">
              <p className="text-gray-400 text-xs md:text-sm mb-1">总成交额</p>
              <p className="text-xl md:text-2xl font-bold text-sol">1,234 SOL</p>
            </div>
          </div>
          
          {/* Projects Grid */}
          {projects.length > 0 ? (
            <>
              {searchQuery && (
                <p className="text-gray-400 text-sm mb-4">
                  找到 <span className="text-white font-bold">{projects.length}</span> 个与 &quot;{searchQuery}&quot; 相关的项目
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 md:py-20">
              <div className="text-5xl md:text-6xl mb-4">{searchQuery ? "🔍" : "🚀"}</div>
              <p className="text-gray-400 text-base md:text-lg mb-4">
                {searchQuery ? `未找到与 "${searchQuery}" 相关的项目` : "暂无项目"}
              </p>
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery("")}
                  className="inline-flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition"
                >
                  清除搜索
                </button>
              ) : (
                <Link
                  href="/submit"
                  className="inline-flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 bg-[#FF8C00] text-black font-bold rounded-lg hover:bg-[#FFAD33] transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  发掘第一个项目
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function IMOHomePage() {
  return <IMOHomeContent />;
}
