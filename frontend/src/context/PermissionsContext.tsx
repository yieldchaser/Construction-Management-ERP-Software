"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useParams } from "next/navigation";
import { getApi } from "@/lib/siteflow";
import { hasPermission, SUPERUSER_KEY, PermissionDict } from "@/lib/rbac";

interface PermissionsContextValue {
  permissions: PermissionDict | null;
  role: string | null;
  priorityType: string | null;
  roleId: string | null;
  loaded: boolean;
  failed: boolean;
  isPartner: boolean;
  isSuperuser: boolean;
  /**
   * FAIL-OPEN permission check for UI gating.
   * - While loading, or if the fetch failed, returns true (never hide anything).
   * - An empty / un-migrated permission set also returns true (mirrors the
   *   backend's fail-open enforcement: deny only when a real set withholds key).
   * - A superuser (`all: true`) always passes.
   */
  can: (key: string) => boolean;
  reload: () => void;
}

const DEFAULT: PermissionsContextValue = {
  permissions: null,
  role: null,
  priorityType: null,
  roleId: null,
  loaded: false,
  failed: false,
  isPartner: false,
  isSuperuser: false,
  can: () => true, // fail-open default
  reload: () => {},
};

const PermissionsContext = createContext<PermissionsContextValue>(DEFAULT);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const [permissions, setPermissions] = useState<PermissionDict | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [priorityType, setPriorityType] = useState<string | null>(null);
  const [roleId, setRoleId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const fetchMe = useCallback(() => {
    const companyId = params.company_id as string | undefined;
    if (!companyId) return;
    const token =
      typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) {
      setFailed(true);
      setLoaded(true);
      return;
    }
    fetch(getApi("/auth/me"), { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error("auth/me failed");
        return res.json();
      })
      .then((data: any) => {
        setPermissions(data.permissions ?? null);
        setRole(data.role ?? null);
        setPriorityType(data.priority_type ?? null);
        setRoleId(data.role_id ?? null);
        setLoaded(true);
        setFailed(false);
      })
      .catch(() => {
        setFailed(true);
        setLoaded(true);
      });
  }, [params.company_id]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const can = useCallback(
    (key: string): boolean => {
      if (!loaded || failed) return true; // fail-open while loading / on error
      if (!permissions) return true;
      if (permissions[SUPERUSER_KEY] === true) return true;
      if (Object.keys(permissions).length === 0) return true; // un-migrated -> open
      return hasPermission(permissions, key);
    },
    [loaded, failed, permissions]
  );

  const isPartner = priorityType === "partner";
  const isSuperuser = !!permissions && permissions[SUPERUSER_KEY] === true;

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        role,
        priorityType,
        roleId,
        loaded,
        failed,
        isPartner,
        isSuperuser,
        can,
        reload: fetchMe,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextValue {
  return useContext(PermissionsContext);
}
