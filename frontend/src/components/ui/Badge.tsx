import React from "react";
import Icon, { type IconName } from "@/components/marketing/Icon";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "chart-1"
  | "chart-2"
  | "chart-3"
  | "chart-4"
  | "chart-5"
  | "chart-6"
  | "chart-7"
  | "chart-8";

const TONE: Record<BadgeTone, string> = {
  neutral: "bg-muted/10 text-muted border-border-custom",
  primary: "bg-primary/10 text-primary border-primary/20",
  info:    "bg-info/10 text-info border-info/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger:  "bg-danger/10 text-danger border-danger/20",
  "chart-1": "bg-chart-1/10 text-chart-1 border-chart-1/20",
  "chart-2": "bg-chart-2/10 text-chart-2 border-chart-2/20",
  "chart-3": "bg-chart-3/10 text-chart-3 border-chart-3/20",
  "chart-4": "bg-chart-4/10 text-chart-4 border-chart-4/20",
  "chart-5": "bg-chart-5/10 text-chart-5 border-chart-5/20",
  "chart-6": "bg-chart-6/10 text-chart-6 border-chart-6/20",
  "chart-7": "bg-chart-7/10 text-chart-7 border-chart-7/20",
  "chart-8": "bg-chart-8/10 text-chart-8 border-chart-8/20",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: IconName;
  children?: React.ReactNode;
  className?: string;
}

export function Badge({
  tone = "neutral",
  icon,
  children,
  className = "",
  ...props
}: BadgeProps) {
  const toneClasses = TONE[tone] || TONE.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneClasses} ${className}`}
      {...props}
    >
      {icon && <Icon name={icon} className="w-3 h-3 shrink-0" />}
      {children}
    </span>
  );
}

export default Badge;
