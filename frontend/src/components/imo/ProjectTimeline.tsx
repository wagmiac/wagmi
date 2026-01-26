"use client";

import { TimelineEvent, TimelineEventType, ProjectStatus } from "@/types/imo";

interface ProjectTimelineProps {
  events: TimelineEvent[];
  status?: ProjectStatus;
  showJourney?: boolean;
}

// 项目旅程的三个阶段（无竞拍）
type JourneyStage = "launched" | "claimed" | "launching";

const journeyStages: { key: JourneyStage; label: string; icon: string }[] = [
  { key: "launching", label: "发射中", icon: "🚀" },
  { key: "launched", label: "已发射", icon: "✅" },
  { key: "claimed", label: "已认领", icon: "🏆" },
];

// 根据项目状态计算当前阶段
function getCurrentStage(status: ProjectStatus): JourneyStage {
  switch (status) {
    case "launching":
      return "launching";
    case "launched":
      return "launched";
    case "claimed":
      return "claimed";
    default:
      return "launching";
  }
}

// 检查阶段是否完成
function isStageCompleted(stage: JourneyStage, currentStage: JourneyStage): boolean {
  const order: JourneyStage[] = ["launching", "launched", "claimed"];
  return order.indexOf(stage) < order.indexOf(currentStage);
}

// 检查是否为当前阶段
function isCurrentStage(stage: JourneyStage, currentStage: JourneyStage): boolean {
  return stage === currentStage;
}

const eventConfig: Record<TimelineEventType, { icon: string; color: string; label: string }> = {
  discovered: {
    icon: "🔍",
    color: "text-[#FF8C00]",
    label: "发掘并发射",
  },
  launched: {
    icon: "🚀",
    color: "text-[#10B981]",
    label: "上链成功",
  },
  claimed: {
    icon: "🏆",
    color: "text-[#F59E0B]",
    label: "认领成功",
  },
  verified: {
    icon: "✅",
    color: "text-[#10B981]",
    label: "验证通过",
  },
};

function formatEventDescription(event: TimelineEvent): string {
  switch (event.type) {
    case "discovered":
      const firstBuy = event.data?.firstBuyAmount as string | undefined;
      return `伯乐 ${event.actorName || shortenAddress(event.actor)} 发掘并发射${firstBuy ? `，首单 ${firstBuy}` : ""}`;
    case "launched":
      const launchpad = event.data?.launchpad as string | undefined;
      return `在 ${launchpad || "发射台"} 上链成功`;
    case "claimed":
      return `被 ${event.actorName || shortenAddress(event.actor)} 认领`;
    case "verified":
      const verifyType = event.data?.type as string | undefined;
      return `${verifyType || ""} 验证通过`;
    default:
      return "";
  }
}

function shortenAddress(address?: string): string {
  if (!address) return "未知";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).replace(/\//g, "-");
}

// 项目旅程进度条组件
function ProjectJourney({ status }: { status: ProjectStatus }) {
  const currentStage = getCurrentStage(status);
  
  return (
    <div className="mb-6">
      <h4 className="text-sm font-medium text-gray-400 mb-3">项目旅程</h4>
      <div className="flex items-center justify-between relative">
        {/* 连接线 */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-white/10" />
        
        {journeyStages.map((stage, index) => {
          const completed = isStageCompleted(stage.key, currentStage);
          const current = isCurrentStage(stage.key, currentStage);
          const isPast = completed || current;
          
          return (
            <div key={stage.key} className="relative flex flex-col items-center z-10">
              {/* 节点 */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all
                  ${completed ? "bg-[#10B981] text-white" : ""}
                  ${current ? "bg-[#00E5FF] text-black ring-2 ring-[#00E5FF]/30" : ""}
                  ${!isPast ? "bg-white/10 text-gray-500" : ""}
                `}
              >
                {completed ? "✓" : stage.icon}
              </div>
              
              {/* 标签 */}
              <span
                className={`mt-2 text-xs font-medium
                  ${completed ? "text-[#10B981]" : ""}
                  ${current ? "text-[#00E5FF]" : ""}
                  ${!isPast ? "text-gray-500" : ""}
                `}
              >
                {stage.label}
              </span>
              
              {/* 连接线颜色覆盖 */}
              {index < journeyStages.length - 1 && (
                <div
                  className={`absolute top-4 left-1/2 w-[calc(100%+2rem)] h-0.5 -z-10
                    ${completed ? "bg-[#10B981]" : "bg-transparent"}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ProjectTimeline({ events, status = "launching", showJourney = true }: ProjectTimelineProps) {
  return (
    <div>
      {/* 项目旅程进度条 */}
      {showJourney && <ProjectJourney status={status} />}
      
      {/* 分割线 */}
      {showJourney && events.length > 0 && (
        <div className="border-t border-white/10 mb-4" />
      )}
      
      {/* 事件时间线 */}
      {events.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          暂无动态
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
          {events.map((event, index) => {
            const config = eventConfig[event.type];
            const isLast = index === events.length - 1;
            
            return (
              <div key={event.id} className="flex gap-3">
                {/* Timeline Line & Icon */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-lg ${config.color}`}>
                    {config.icon}
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 bg-white/10 my-2" />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${config.color}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(event.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {formatEventDescription(event)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
