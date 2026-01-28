import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProjectByTicker } from "@/lib/api/imo";
import { Project } from "@/types/imo";
import ProjectDetailClient from "./ProjectDetailClient";

interface PageProps {
  params: Promise<{ ticker: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ticker } = await params;
  const response = await getProjectByTicker(ticker);
  
  if (!response.success || !response.data) {
    return {
      title: "项目未找到",
    };
  }

  const project = response.data as Project;

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
  const response = await getProjectByTicker(ticker);

  if (!response.success || !response.data) {
    notFound();
  }

  const project = response.data as Project;

  return <ProjectDetailClient project={project} />;
}
