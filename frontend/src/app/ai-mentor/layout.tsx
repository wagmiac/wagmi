import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 创业导师",
  description: "WAGMI Sensei - 专注 AI 时代超级个体创业的 AI 导师。从 Idea 验证到 MVP 规划，从冷启动到增长策略，随时为你解答。",
  openGraph: {
    title: "AI 创业导师 - WAGMI Sensei",
    description: "专注 AI 时代超级个体创业的 AI 导师，24/7 在线为你解答创业问题。",
  }
};

export default function AIMentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
