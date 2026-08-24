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

export default async function LegacyRedirect({ params }: PageProps) {
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  redirect(`/c/${resolvedParams.company_id}/d/procurement?project=${resolvedParams.project_id}`);
}
