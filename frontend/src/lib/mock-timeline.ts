import { TimelineEvent } from "@/types/imo";

// Mock 时间线数据（无竞拍版本）
export function getMockTimelineEvents(projectId: string): TimelineEvent[] {
  const now = Date.now();
  
  const baseEvents: TimelineEvent[] = [
    {
      id: "1",
      projectId,
      type: "discovered",
      actor: "7xKXtg...2a1b",
      actorName: "crypto_scout",
      data: { firstBuyAmount: "2.5 SOL" },
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "2",
      projectId,
      type: "launched",
      data: { launchpad: "pump.fun" },
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000 + 60000).toISOString(), // 发掘后1分钟
    },
  ];


  // 根据项目状态添加更多事件
  if (projectId === "2" || projectId === "5") {
    // 已认领项目
    baseEvents.push(
      {
        id: "3",
        projectId,
        type: "claimed",
        actor: "7ePZxi...6f5g",
        actorName: "Vercel Team",
        createdAt: new Date(now - 10 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "4",
        projectId,
        type: "verified",
        data: { type: "Twitter" },
        createdAt: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "5",
        projectId,
        type: "verified",
        data: { type: "GitHub" },
        createdAt: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
      }
    );
  }

  return baseEvents.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
