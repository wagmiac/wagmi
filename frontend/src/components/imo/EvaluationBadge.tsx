'use client';

import { EvaluationGrade, getGradeStyle } from '@/types/imo';

interface EvaluationBadgeProps {
  grade: EvaluationGrade;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * 评估等级徽章组件
 * 用于在项目卡片和详情页展示AI评估等级
 */
export function EvaluationBadge({ 
  grade, 
  size = 'md', 
  showLabel = false,
  className = '' 
}: EvaluationBadgeProps) {
  const style = getGradeStyle(grade);
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };
  
  const fontSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg font-semibold',
  };

  return (
    <div 
      className={`inline-flex items-center gap-1 rounded-md ${style.bgColor} ${sizeClasses[size]} ${className}`}
      style={{ borderColor: style.color, borderWidth: '1px' }}
    >
      <span 
        className={`font-bold ${fontSizeClasses[size]}`}
        style={{ color: style.color }}
      >
        {grade}
      </span>
      {showLabel && (
        <span 
          className={`${fontSizeClasses[size]}`}
          style={{ color: style.color }}
        >
          {style.label}
        </span>
      )}
    </div>
  );
}

interface EvaluationGradeCardProps {
  grade: EvaluationGrade;
  label: string;
  icon?: string;
  analysis?: string;
}

/**
 * 评估维度卡片（用于详情页六维度展示）
 */
export function EvaluationGradeCard({ 
  grade, 
  label, 
  icon,
  analysis 
}: EvaluationGradeCardProps) {
  const style = getGradeStyle(grade);

  return (
    <div className={`rounded-lg p-3 ${style.bgColor} border`} style={{ borderColor: `${style.color}40` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <span className="text-sm font-medium text-gray-200">{label}</span>
        </div>
        <EvaluationBadge grade={grade} size="sm" />
      </div>
      {analysis && (
        <p className="text-xs text-gray-400 line-clamp-3">{analysis}</p>
      )}
    </div>
  );
}

interface EvaluationSummaryBadgeProps {
  grade?: EvaluationGrade;
  summary?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * 评估摘要徽章（用于项目卡片）
 * 显示综合评级和一句话总结
 */
export function EvaluationSummaryBadge({ 
  grade, 
  summary,
  onClick,
  className = '' 
}: EvaluationSummaryBadgeProps) {
  if (!grade) {
    return (
      <div className={`flex items-center gap-1.5 text-gray-500 text-xs ${className}`}>
        <span className="w-4 h-4 rounded bg-gray-700 animate-pulse" />
        <span>评估中...</span>
      </div>
    );
  }

  const style = getGradeStyle(grade);

  return (
    <div 
      className={`flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity ${className}`}
      onClick={onClick}
      title={summary}
    >
      <EvaluationBadge grade={grade} size="sm" />
      {summary && (
        <span className="text-xs text-gray-400 truncate max-w-[150px]">
          {summary}
        </span>
      )}
    </div>
  );
}
