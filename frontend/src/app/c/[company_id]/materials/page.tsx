"use client";

// Materials now live inside the Library hub as the "Material" tab (with a
// separate "Material Category" tab). This route is kept as a redirect so old
// links and bookmarks land on the Library tab instead of a dead page.
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function MaterialsRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.company_id as string;

  useEffect(() => {
    router.replace(`/c/${companyId}/d/library?tab=material`);
  }, [companyId, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-card text-muted">
      <div className="text-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-border-custom border-t-transparent mx-auto" />
        <div>Redirecting to Library...</div>
      </div>
    </div>
  );
}
