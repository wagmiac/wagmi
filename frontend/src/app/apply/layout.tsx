import { Metadata } from "next";

export const metadata: Metadata = {
  title: "申请孵化",
  description: "申请加入 WAGMI 孵化计划。提交你的 Idea，获得天使投资和社区支持，把想法变成现实。",
  openGraph: {
    title: "申请 WAGMI 孵化",
    description: "提交你的创业 Idea，获得资金、社区和 AI 导师的全方位支持。",
  }
};

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
