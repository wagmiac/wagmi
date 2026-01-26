import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProjectByTicker } from "@/lib/mock-data";
import ProjectDetailClient from "./ProjectDetailClient";

interface PageProps {
  params: Promise<{ ticker: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ticker } = await params;
  const project = getProjectByTicker(ticker);
  
  if (!project) {
    return {
      title: "项目未找到",
    };
  }

  return {
    title: `${project.ticker} - ${project.name}`,
    description: project.description,
    openGraph: {
      title: `${project.ticker} - ${project.name} | WAGMI IMO`,
      description: project.description,
      images: project.logo ? [project.logo] : [],
    },
  };
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { ticker } = await params;
  const project = getProjectByTicker(ticker);

  if (!project) {
    notFound();
  }

  return <ProjectDetailClient project={project} />;
}
