"use client";

import { ProjectStatus } from "@/types/imo";

interface StatusBadgeProps {
  status: ProjectStatus;
  size?: "sm" | "md";
}

const statusConfig: Record<ProjectStatus, { label: string; className: string }> = {
  discovering: {
    label: "发掘中",
    className: "bg-[#FF8C00]/20 text-[#FF8C00] border-[#FF8C00]/30",
  },
  auctioning: {
    label: "竞拍中",
    className: "bg-[#9945FF]/20 text-[#9945FF] border-[#9945FF]/30 animate-pulse",
  },
  launching: {
    label: "发射中",
    className: "bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/30 animate-pulse",
  },
  launched: {
    label: "已发射",
    className: "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30",
  },
  claimed: {
    label: "已认领",
    className: "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30",
  },
  failed: {
    label: "失败",
    className: "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30",
  },
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
};

export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status || "未知",
    className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  
  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${config.className} ${sizeClasses[size]}`}>
      {config.label}
    </span>
  );
}
