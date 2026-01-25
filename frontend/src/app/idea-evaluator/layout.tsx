import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Idea 评估器",
  description: "使用 AI 快速评估你的创业 Idea！基于 6 大维度分析，获得专业评级和改进建议。WAGMI 出品。",
  openGraph: {
    title: "AI Idea 评估器 - 测测你的创业想法",
    description: "60 秒 AI 评估，看看你的 Idea 能不能成为下一个独角兽！",
  }
};

export default function IdeaEvaluatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
