import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{
    company_id: string;
    project_id: string;
  }> | {
    company_id: string;
    project_id: string;
  };
}

export default async function PlanningPage({ params }: PageProps) {
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  const companyId = resolvedParams.company_id;
  const projectId = resolvedParams.project_id;

  redirect(`/c/${companyId}/p/${projectId}/planning/gantt`);
}
