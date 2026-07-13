"use client";

import React from "react";
import { usePermissions } from "@/context/PermissionsContext";

interface CanProps {
  permission: string;
  children: React.ReactNode;
  /** Rendered when the caller lacks the permission (default: nothing). */
  fallback?: React.ReactNode;
}

/** Render `children` only when the caller holds `permission` (fail-open). */
export function Can({ permission, children, fallback = null }: CanProps) {
  const { can } = usePermissions();
  return <>{can(permission) ? children : fallback}</>;
}

interface PermissionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission: string;
  /** When true, the button is hidden instead of disabled if not permitted. */
  hideWhenDenied?: boolean;
}

/**
 * Action button that is DISABLED (or hidden) when the caller lacks `permission`.
 * Used for high-risk actions: approve / delete / run-payroll / settings.
 * Fail-open: while permissions load or on error the button stays enabled.
 */
export function PermissionButton({
  permission,
  hideWhenDenied = false,
  disabled,
  children,
  ...rest
}: PermissionButtonProps) {
  const { can } = usePermissions();
  const allowed = can(permission);
  if (!allowed && hideWhenDenied) return null;
  return (
    <button disabled={disabled || !allowed} {...rest}>
      {children}
    </button>
  );
}
