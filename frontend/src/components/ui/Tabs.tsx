import React from "react";

export type TabDefinition<T extends string = string> =
  | { id: T; label: string; count?: number | string; icon?: React.ReactNode }
  | { key: T; label: string; count?: number | string; icon?: React.ReactNode }
  | { value: T; label: string; count?: number | string; icon?: React.ReactNode }
  | T;

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number | string;
  icon?: React.ReactNode;
}

interface SegmentedTabsProps<T extends string = string> {
  tabs: readonly TabDefinition<T>[] | TabDefinition<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
  size?: "sm" | "md";
}

function normalizeTab<T extends string>(tab: TabDefinition<T>): TabItem<T> {
  if (typeof tab === "string") {
    return { id: tab as T, label: tab };
  }
  const id = (("id" in tab && tab.id) || ("key" in tab && tab.key) || ("value" in tab && tab.value) || "") as T;
  return {
    id,
    label: tab.label,
    count: tab.count,
    icon: tab.icon,
  };
}

export function SegmentedTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className = "",
  size = "md",
}: SegmentedTabsProps<T>) {
  const normalizedTabs: TabItem<T>[] = tabs.map((t) => normalizeTab<T>(t));

  return (
    <div
      role="tablist"
      className={`inline-flex items-center gap-1 p-1 bg-card border border-border-custom rounded-lg shrink-0 overflow-x-auto ${className}`}
    >
      {normalizedTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-md font-semibold transition-all duration-150 cursor-pointer ${
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-xs"
            } ${
              isActive
                ? "bg-elevated text-foreground shadow-xs [box-shadow:inset_0_1px_0_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.4)]"
                : "text-muted hover:text-foreground hover:bg-elevated/40"
            }`}
          >
            {tab.icon && (
              <span className={isActive ? "text-primary" : "text-muted"}>
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "bg-elevated text-muted"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export const Tabs = SegmentedTabs;
export default SegmentedTabs;
