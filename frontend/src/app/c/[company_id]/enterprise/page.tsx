"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getApi, authHeaders, fmtINR } from "@/lib/siteflow";
import { useCompanySettings } from "@/context/CompanySettingsContext";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/PageHeader";
import { TableSkeleton, CardSkeleton } from "@/components/ui/Skeleton";

type RollupCompany = {
  id: string;
  name: string;
  project_count: number;
  party_count: number;
  to_pay: number;
  to_receive: number;
  advance_paid: number;
  advance_received: number;
  balance: number;
};

type Rollup = {
  enterprise_id: string;
  enterprise_name: string;
  company_count: number;
  project_count: number;
  party_count: number;
  total_to_pay: number;
  total_to_receive: number;
  total_advance_paid: number;
  total_advance_received: number;
  total_balance: number;
  companies: RollupCompany[];
};

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border-custom bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent || "text-foreground"}`}>{value}</div>
    </div>
  );
}

export default function EnterpriseRollupPage() {
  const { currencyDecimalPlaces } = useCompanySettings();
  const params = useParams();
  const companyId = params.company_id as string;
  const [data, setData] = useState<Rollup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(getApi(`/finance/enterprise-rollup/${companyId}`), { headers: authHeaders() })
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.detail || "Failed to load enterprise rollup");
        }
        return r.json();
      })
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message || "Failed to load enterprise rollup");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [companyId]);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <PageShell width="wide">
          <div className="space-y-6">
            <CardSkeleton />
            <TableSkeleton rows={4} cols={6} />
          </div>
        </PageShell>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto">
        <PageShell width="wide">
          <p className="text-danger">{error}</p>
        </PageShell>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="Enterprise Rollup"
        subtitle={`Consolidated view across ${data.company_count} compan${data.company_count === 1 ? "y" : "ies"}${data.company_count === 1 ? " — this entity is not yet grouped under an enterprise." : ""}`}
      />
      <div className="flex-1 overflow-y-auto">
        <PageShell width="wide">
          <div className="space-y-6">

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Companies" value={String(data.company_count)} />
        <StatCard label="Projects" value={String(data.project_count)} />
        <StatCard label="Parties" value={String(data.party_count)} />
        <StatCard label="To Pay" value={fmtINR(data.total_to_pay, currencyDecimalPlaces)} accent="text-warning" />
        <StatCard label="To Receive" value={fmtINR(data.total_to_receive, currencyDecimalPlaces)} accent="text-success" />
        <StatCard label="Net Balance" value={fmtINR(data.total_balance, currencyDecimalPlaces)} />
      </div>

      <div className="rounded-lg border border-border-custom bg-card overflow-hidden">
        <div className="border-b border-border-custom px-4 py-3 text-sm font-semibold text-foreground">
          Companies in this group
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr className="border-b border-border-custom">
              <th className="px-4 py-2 font-medium">Company</th>
              <th className="px-4 py-2 font-medium">Projects</th>
              <th className="px-4 py-2 font-medium">Parties</th>
              <th className="px-4 py-2 font-medium text-right">To Pay</th>
              <th className="px-4 py-2 font-medium text-right">To Receive</th>
              <th className="px-4 py-2 font-medium text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {data.companies.map((c) => (
              <tr key={c.id} className="border-b border-border-custom/50 last:border-b-0">
                <td className="px-4 py-2 text-foreground">{c.name}</td>
                <td className="px-4 py-2 text-muted">{c.project_count}</td>
                <td className="px-4 py-2 text-muted">{c.party_count}</td>
                <td className="px-4 py-2 text-right text-warning">{fmtINR(c.to_pay, currencyDecimalPlaces)}</td>
                <td className="px-4 py-2 text-right text-success">{fmtINR(c.to_receive, currencyDecimalPlaces)}</td>
                <td className="px-4 py-2 text-right text-foreground">{fmtINR(c.balance, currencyDecimalPlaces)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
          </div>
        </PageShell>
      </div>
    </div>
  );
}
