import { Metadata } from "next";

export const metadata: Metadata = {
  title: "实时数据",
  description: "WAGMI 平台实时数据面板。查看 $WAGMI 价格、市值、TVL、孵化项目代币行情、回购销毁统计等链上透明数据。",
  openGraph: {
    title: "WAGMI 实时数据面板",
    description: "链上透明数据，实时更新。",
  }
};

export default function StatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
