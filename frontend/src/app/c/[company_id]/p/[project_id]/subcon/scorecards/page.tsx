import { redirect } from "next/navigation";
export default function LegacyRedirect({ params }: { params: { company_id: string; project_id: string } }) {
  redirect(`/c/${params.company_id}/d/subcon/scorecards`);
}
