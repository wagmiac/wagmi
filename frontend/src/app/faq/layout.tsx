import { Metadata } from "next";

export const metadata: Metadata = {
  title: "常见问题 FAQ",
  description: "关于 WAGMI 的常见问题解答。了解代币经济、项目孵化、AI 工具、社区参与等。",
  openGraph: {
    title: "WAGMI FAQ - 常见问题",
    description: "关于 WAGMI 去中心化孵化平台的常见问题解答。",
  }
};

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
