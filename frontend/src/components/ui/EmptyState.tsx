import React from "react";
import Link from "next/link";
import Icon, { type IconName } from "@/components/marketing/Icon";

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: IconName;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border-custom bg-card/50 ${
        compact ? "p-6" : "p-12"
      } ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-muted max-w-sm">{description}</p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {action &&
            (action.href ? (
              <Link
                href={action.href}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all"
              >
                {action.icon && <Icon name={action.icon} className="w-3.5 h-3.5" />}
                {action.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={action.onClick}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all cursor-pointer"
              >
                {action.icon && <Icon name={action.icon} className="w-3.5 h-3.5" />}
                {action.label}
              </button>
            ))}

          {secondaryAction &&
            (secondaryAction.href ? (
              <Link
                href={secondaryAction.href}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-custom bg-card px-4 py-2 text-xs font-semibold text-muted hover:text-foreground hover:bg-elevated transition-all"
              >
                {secondaryAction.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-custom bg-card px-4 py-2 text-xs font-semibold text-muted hover:text-foreground hover:bg-elevated transition-all cursor-pointer"
              >
                {secondaryAction.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
