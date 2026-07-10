"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getApiHost } from "@/lib/api";

export type CompanySettings = {
  currencyDecimalPlaces: number;
  quantityDecimalPlaces: number;
  loading: boolean;
};

// Legacy default for currency is 0 (rounded rupees) so screens that render
// before settings load keep the previous behavior; once the GET resolves we
// switch to the company's configured value (Company.currency_decimal_places).
const DEFAULTS: CompanySettings = {
  currencyDecimalPlaces: 0,
  quantityDecimalPlaces: 3,
  loading: true,
};

const CompanySettingsContext = createContext<CompanySettings>(DEFAULTS);

export function CompanySettingsProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const [settings, setSettings] = useState<CompanySettings>(DEFAULTS);

  useEffect(() => {
    let isActive = true;

    const companyId =
      (params.company_id as string) || "e0000000-0000-0000-0000-000000000000";
    const token =
      typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

    const resolve = async () => {
      try {
        const res = await fetch(
          `${getApiHost()}/apis/v3/settings/company/${companyId}`,
          { headers: authHeaders }
        );
        if (res.ok && isActive) {
          const data = await res.json();
          setSettings({
            currencyDecimalPlaces:
              typeof data.currency_decimal_places === "number"
                ? data.currency_decimal_places
                : DEFAULTS.currencyDecimalPlaces,
            quantityDecimalPlaces:
              typeof data.quantity_decimal_places === "number"
                ? data.quantity_decimal_places
                : DEFAULTS.quantityDecimalPlaces,
            loading: false,
          });
        } else if (isActive) {
          setSettings((s) => ({ ...s, loading: false }));
        }
      } catch {
        if (isActive) setSettings((s) => ({ ...s, loading: false }));
      }
    };

    resolve();

    return () => {
      isActive = false;
    };
  }, [params.company_id]);

  return (
    <CompanySettingsContext.Provider value={settings}>
      {children}
    </CompanySettingsContext.Provider>
  );
}

// Safe outside a provider: returns the defaults so any fmtINR call site can use
// the hook without crashing (it just renders with the legacy default until/if a
// provider is present).
export function useCompanySettings(): CompanySettings {
  return useContext(CompanySettingsContext);
}
