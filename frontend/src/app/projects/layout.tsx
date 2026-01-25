import { Metadata } from "next";

export const metadata: Metadata = {
  title: "孵化项目",
  description: "探索 WAGMI 孵化的超级个体创业项目。从 Idea 到增长，见证 AI 时代的创业新星。",
  openGraph: {
    title: "WAGMI 孵化项目",
    description: "探索正在改变世界的超级个体创业项目，成为早期支持者。",
  }
};

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
