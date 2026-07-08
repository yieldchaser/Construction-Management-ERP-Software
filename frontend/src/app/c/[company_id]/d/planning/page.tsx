import { redirect } from "next/navigation";
export default function PlanningRedirect({ params }: { params: { company_id: string } }) {
  redirect(`/c/${params.company_id}/d/planning/gantt`);
}
