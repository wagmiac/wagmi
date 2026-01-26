"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export const SIDEBAR_WIDTH = {
  expanded: 200,
  collapsed: 80,
  mobile: 0, // 移动端不需要侧边栏边距
};

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  sidebarWidth: number;
  isMobile: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 从 localStorage 读取状态 + 检测移动端
  useEffect(() => {
    setMounted(true);
    
    // 检测是否移动端
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
    
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 保存状态到 localStorage
  const handleSetCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  };

  const toggleCollapsed = () => {
    handleSetCollapsed(!isCollapsed);
  };

  // 移动端返回0，桌面端根据折叠状态返回
  const getSidebarWidth = () => {
    if (!mounted) return SIDEBAR_WIDTH.expanded;
    if (isMobile) return SIDEBAR_WIDTH.mobile;
    return isCollapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded;
  };

  const contextValue: SidebarContextType = {
    isCollapsed: mounted ? isCollapsed : false,
    setIsCollapsed: handleSetCollapsed,
    toggleCollapsed,
    sidebarWidth: getSidebarWidth(),
    isMobile: mounted ? isMobile : false,
  };

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
