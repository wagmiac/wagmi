import { Metadata } from "next";

export const metadata: Metadata = {
  title: "社区",
  description: "加入 WAGMI 社区，与 12,500+ 超级个体创业者一起交流、分享、互助。查看社区活动、贡献者排行榜和生态合作伙伴。",
  openGraph: {
    title: "WAGMI 社区",
    description: "我们不只是投资者，我们是一群相信 We're All Gonna Make It 的建设者。",
  }
};

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
