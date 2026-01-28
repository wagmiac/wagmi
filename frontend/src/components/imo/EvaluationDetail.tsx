'use client';

import React, { useState } from 'react';
import { 
  ProjectEvaluation, 
  EvaluationGrade,
  EVALUATION_DIMENSIONS,
  parseEvaluationArray,
  getGradeStyle 
} from '@/types/imo';
import { EvaluationBadge, EvaluationGradeCard } from './EvaluationBadge';

interface EvaluationDetailProps {
  evaluation: ProjectEvaluation;
  onReEvaluate?: () => void;
  canReEvaluate?: boolean;
  isReEvaluating?: boolean;
}

/**
 * 评估详情组件
 * 完整展示AI评估报告
 */
export function EvaluationDetail({ 
  evaluation, 
  onReEvaluate,
  canReEvaluate = false,
  isReEvaluating = false
}: EvaluationDetailProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'full'>('overview');
  
  const highlights = parseEvaluationArray(evaluation.highlights);
  const risks = parseEvaluationArray(evaluation.risks);
  const overallStyle = getGradeStyle(evaluation.overall_grade);

  // 构建维度数据
  const dimensions = EVALUATION_DIMENSIONS.map(dim => ({
    ...dim,
    grade: evaluation[`grade_${dim.key}` as keyof ProjectEvaluation] as EvaluationGrade,
    analysis: evaluation[`analysis_${dim.key}` as keyof ProjectEvaluation] as string,
  }));

  return (
    <div className="bg-white/5 rounded-xl border border-white/10">
      {/* 头部 */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            🤖 AI 评估报告
          </h3>
          {canReEvaluate && (
            <button
              onClick={onReEvaluate}
              disabled={isReEvaluating}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50 transition-colors"
            >
              {isReEvaluating ? '评估中...' : '🔄 重新评估'}
            </button>
          )}
        </div>
        
        {/* 综合评级 */}
        <div className="flex items-center gap-4">
          <div 
            className={`px-4 py-2 rounded-xl ${overallStyle.bgColor} border`}
            style={{ borderColor: overallStyle.color }}
          >
            <div className="text-xs text-gray-400 mb-1">综合评级</div>
            <div className="flex items-center gap-2">
              <span 
                className="text-3xl font-bold"
                style={{ color: overallStyle.color }}
              >
                {evaluation.overall_grade}
              </span>
              <span 
                className="text-sm"
                style={{ color: overallStyle.color }}
              >
                {overallStyle.label}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-gray-300 text-sm leading-relaxed">
              {evaluation.summary}
            </p>
          </div>
        </div>
      </div>

      {/* 标签切换 */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'overview' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          概览
        </button>
        <button
          onClick={() => setActiveTab('full')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'full' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          完整报告
        </button>
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {activeTab === 'overview' ? (
          <div className="space-y-6">
            {/* 六维度评估 */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">六维度评估</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {dimensions.map(dim => (
                  <EvaluationGradeCard
                    key={dim.key}
                    grade={dim.grade}
                    label={dim.label}
                    icon={dim.icon}
                    analysis={dim.analysis}
                  />
                ))}
              </div>
            </div>

            {/* 亮点与风险 */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* 亮点 */}
              <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
                <h4 className="text-sm font-medium text-green-400 mb-3 flex items-center gap-2">
                  💎 核心亮点
                </h4>
                <ul className="space-y-2">
                  {highlights.map((item, index) => (
                    <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 风险 */}
              <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
                <h4 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
                  ⚠️ 风险提示
                </h4>
                <ul className="space-y-2">
                  {risks.map((item, index) => (
                    <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">!</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 投资建议 */}
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
              <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
                💡 投资建议
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed">
                {evaluation.investment_advice}
              </p>
            </div>

            {/* 元信息 */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-white/5">
              <span>
                评估来源: {evaluation.evaluated_by === 'system' ? '系统自动' : 
                          evaluation.evaluated_by === 'admin' ? '管理员' : '伯乐'} 
                · 版本 v{evaluation.version}
              </span>
              <span>
                {new Date(evaluation.created_at).toLocaleString('zh-CN')}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
            {evaluation.full_report.split('\n\n').map((paragraph, index) => {
              const trimmed = paragraph.trim();
              if (!trimmed) return null;
              
              // 一级标题
              if (trimmed.startsWith('# ')) {
                return (
                  <h1 key={index} className="text-lg font-semibold text-gray-200 mt-6 mb-3 pb-2 border-b border-white/5">
                    {trimmed.replace(/^# /, '')}
                  </h1>
                );
              }
              
              // 二级标题
              if (trimmed.startsWith('## ')) {
                return (
                  <h2 key={index} className="text-base font-semibold text-gray-300 mt-5 mb-2">
                    {trimmed.replace(/^## /, '')}
                  </h2>
                );
              }
              
              // 三级标题（维度标题）
              if (trimmed.startsWith('### ')) {
                return (
                  <h3 key={index} className="text-sm font-medium text-amber-500/80 mt-4 mb-2">
                    {trimmed.replace(/^### /, '')}
                  </h3>
                );
              }
              
              // 列表项
              if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const items = trimmed.split('\n').filter(line => line.trim());
                return (
                  <ul key={index} className="space-y-1.5 pl-1">
                    {items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-600/70 mt-0.5">•</span>
                        <span className="flex-1">{formatInlineText(item.replace(/^[-*] /, ''))}</span>
                      </li>
                    ))}
                  </ul>
                );
              }
              
              // 普通段落
              return (
                <p key={index} className="text-gray-400 leading-relaxed">
                  {formatInlineText(trimmed)}
                </p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 格式化行内文本（加粗等）
 */
function formatInlineText(text: string): React.ReactNode {
  // 处理 **加粗** 文本
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-amber-500/70 font-medium">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

interface EvaluationLoadingProps {
  className?: string;
}

/**
 * 评估加载中状态
 */
export function EvaluationLoading({ className = '' }: EvaluationLoadingProps) {
  return (
    <div className={`bg-white/5 rounded-xl border border-white/10 p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/20 animate-pulse" />
        <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-white/10 rounded animate-pulse" />
      </div>
      <div className="mt-4 text-center text-sm text-gray-500">
        🤖 AI 正在分析项目...
      </div>
    </div>
  );
}

interface EvaluationEmptyProps {
  onTrigger?: () => void;
  canTrigger?: boolean;
  className?: string;
}

/**
 * 无评估状态
 */
export function EvaluationEmpty({ onTrigger, canTrigger = false, className = '' }: EvaluationEmptyProps) {
  return (
    <div className={`bg-white/5 rounded-xl border border-white/10 p-6 text-center ${className}`}>
      <div className="text-4xl mb-3">🤖</div>
      <h4 className="text-gray-300 font-medium mb-2">暂无评估</h4>
      <p className="text-sm text-gray-500 mb-4">
        该项目尚未进行AI评估
      </p>
      {canTrigger && onTrigger && (
        <button
          onClick={onTrigger}
          className="px-4 py-2 rounded-lg bg-primary text-black font-medium text-sm hover:bg-primary-light transition-colors"
        >
          立即评估
        </button>
      )}
    </div>
  );
}

interface EvaluatingProps {
  className?: string;
}

/**
 * 评估进行中状态
 */
export function EvaluationInProgress({ className = '' }: EvaluatingProps) {
  return (
    <div className={`bg-white/5 rounded-xl border border-primary/30 p-6 text-center ${className}`}>
      <div className="text-4xl mb-3 animate-bounce">🤖</div>
      <h4 className="text-primary font-medium mb-2">AI 正在评估中...</h4>
      <p className="text-sm text-gray-400 mb-4">
        正在分析项目数据，请稍候片刻
      </p>
      <div className="flex justify-center gap-1">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '300ms' }} />
      </div>
      <p className="text-xs text-gray-500 mt-4">
        通常需要 10-30 秒，请勿刷新页面
      </p>
    </div>
  );
}
