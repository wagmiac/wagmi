"use client";

import { Project, REVENUE_SPLIT } from "@/types/imo";

interface RevenueFlowProps {
  project: Project;
}

interface ReleaseRecord {
  label: string;
  amount: number;
  released: boolean;
}

function formatUSD(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

export default function RevenueFlow({ project }: RevenueFlowProps) {
  // 只有已发射或已认领的项目才显示资金流向
  if (project.status !== "launched" && project.status !== "claimed") {
    return (
      <div className="text-center py-8 text-gray-500">
        代币发射后显示资金流向
      </div>
    );
  }

  // 模拟累计交易税收入（实际应该从项目数据获取）
  const totalTradingFee = project.claimedRevenue || 0;
  
  // 计算各方分成
  const creatorRevenue = totalTradingFee * REVENUE_SPLIT.creator;
  const scoutRevenue = totalTradingFee * REVENUE_SPLIT.scout;
  const platformRevenue = totalTradingFee * REVENUE_SPLIT.platform;
  
  // 创作者释放明细（假设首次释放25%）
  const INITIAL_RELEASE_RATE = 0.25;
  const initialRelease = creatorRevenue * INITIAL_RELEASE_RATE;
  const remainingLocked = creatorRevenue - initialRelease;
  
  const releaseRecords: ReleaseRecord[] = [
    { label: "首次释放 (25%)", amount: initialRelease, released: project.status === "claimed" },
    { label: "第二次释放", amount: 0, released: false },
    { label: "剩余锁定", amount: remainingLocked, released: false },
  ];

  const parties = [
    { 
      icon: "🎨", 
      label: "创作者", 
      percentage: REVENUE_SPLIT.creator * 100, 
      amount: creatorRevenue,
      color: "bg-[#10B981]",
      textColor: "text-[#10B981]"
    },
    { 
      icon: "🔍", 
      label: "伯乐", 
      percentage: REVENUE_SPLIT.scout * 100, 
      amount: scoutRevenue,
      color: "bg-[#00E5FF]",
      textColor: "text-[#00E5FF]"
    },
    { 
      icon: "🏛", 
      label: "平台", 
      percentage: REVENUE_SPLIT.platform * 100, 
      amount: platformRevenue,
      color: "bg-[#FF8C00]",
      textColor: "text-[#FF8C00]"
    },
  ];

  return (
    <div className="space-y-6">
      {/* 累计收入 */}
      <div className="text-center">
        <p className="text-sm text-gray-400 mb-1">累计交易税收入</p>
        <p className="text-2xl font-bold text-white">
          {formatUSD(totalTradingFee)}
        </p>
      </div>

      {/* 分配条 */}
      <div className="h-3 rounded-full overflow-hidden flex bg-white/5">
        {parties.map((party) => (
          <div
            key={party.label}
            className={`${party.color} transition-all`}
            style={{ width: `${party.percentage}%` }}
          />
        ))}
      </div>

      {/* 三方分成卡片 */}
      <div className="grid grid-cols-3 gap-3">
        {parties.map((party) => (
          <div
            key={party.label}
            className="bg-white/5 rounded-lg p-3 text-center"
          >
            <div className="text-xl mb-1">{party.icon}</div>
            <p className="text-xs text-gray-400 mb-1">{party.label}</p>
            <p className={`text-sm font-medium ${party.textColor}`}>
              {party.percentage}%
            </p>
            <p className="text-white font-bold mt-1">
              {formatUSD(party.amount)}
            </p>
          </div>
        ))}
      </div>

      {/* 创作者释放明细 - 只有已认领才显示 */}
      {project.status === "claimed" && (
        <div className="border-t border-white/10 pt-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3">创作者释放明细</h4>
          <div className="space-y-2">
            {releaseRecords.map((record, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {record.released ? (
                    <span className="text-[#10B981]">├─</span>
                  ) : (
                    <span className="text-gray-500">├─</span>
                  )}
                  <span className={record.released ? "text-white" : "text-gray-500"}>
                    {record.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {record.amount > 0 && (
                    <span className={record.released ? "text-white" : "text-gray-500"}>
                      {formatUSD(record.amount)}
                    </span>
                  )}
                  {record.released && <span className="text-[#10B981]">✓</span>}
                  {!record.released && record.label.includes("第二次") && (
                    <span className="text-gray-500">待申请</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
