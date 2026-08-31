import React from "react";
import Link from "next/link";

interface FieldHintProps {
  text: string;
  href?: string;
  linkLabel?: string;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

export default function FieldHint({
  text,
  href,
  linkLabel,
  onAction,
  actionLabel,
  className = "",
}: FieldHintProps) {
  return (
    <p className={`text-[10px] text-muted mt-1 ${className}`.trim()}>
      {text}{" "}
      {href && linkLabel && (
        <Link href={href} className="text-primary hover:underline font-medium inline-block">
          {linkLabel}
        </Link>
      )}
      {onAction && actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="text-primary hover:underline font-medium inline-block cursor-pointer bg-transparent border-0 p-0 text-[10px]"
        >
          {actionLabel}
        </button>
      )}
    </p>
  );
}
