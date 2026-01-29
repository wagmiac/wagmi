"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Sidebar, ProjectCard, useSidebar } from "@/components/imo";
import { listProjects } from "@/lib/api/imo";
import { Project } from "@/types/imo";
import Dropdown from "@/components/ui/Dropdown";

// 排序选项
type SortOption = "newest" | "oldest" | "stars" | "hot";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "newest", label: "最新创建" },
  { value: "oldest", label: "最早创建" },
  { value: "stars", label: "Stars 最多" },
  { value: "hot", label: "热度最高" },
];

function IMOHomeContent() {
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const { sidebarWidth } = useSidebar();
  
  // 项目数据状态
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从后端获取项目列表
  useEffect(() => {
    async function fetchProjects() {
      setLoading(true);
      setError(null);
      try {
        const result = await listProjects({
          // 不再按状态筛选
          limit: 100,
        });
        if (result.success && result.data) {
          setAllProjects(result.data);
        } else {
          setError(result.error || "获取项目列表失败");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "网络错误");
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []); // 只在组件挂载时加载一次

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
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case "oldest":
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case "stars":
          return (b.github_stars || 0) - (a.github_stars || 0);
        case "hot": {
          // 按热度等级排序
          const hotOrder: Record<string, number> = { explosive: 5, hot: 4, warm: 3, normal: 2, cold: 1 };
          const aHot = hotOrder[a.github_hot_level || 'cold'] || 0;
          const bHot = hotOrder[b.github_hot_level || 'cold'] || 0;
          return bHot - aHot;
        }
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
          {/* Filters Bar - Above Projects */}
          <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4 mb-6">
            {/* 项目数量 */}
            <div className="text-gray-400 text-sm">
              共 <span className="text-white font-bold">{projects.length}</span> 个项目
            </div>
            
            {/* Sort Dropdown */}
            <Dropdown
              options={sortOptions}
              value={sortBy}
              onChange={setSortBy}
              className="min-w-[120px]"
            />
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
