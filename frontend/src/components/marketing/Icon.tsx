type IconName =
  | "architecture"
  | "menu"
  | "close"
  | "arrow_forward"
  | "edit_calendar"
  | "inventory_2"
  | "mobile_friendly"
  | "account_balance"
  | "check_circle"
  | "table_chart"
  | "domain_verification";

interface IconProps {
  name: IconName;
  className?: string;
}

const ICON_PATHS: Record<IconName, React.ReactNode> = {
  architecture: (
    <>
      <path d="M12 2v4" />
      <path d="m6.5 21 5.5-15 5.5 15" />
      <path d="M9.5 15h5" />
      <path d="M4 21h16" />
    </>
  ),
  menu: (
    <>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </>
  ),
  close: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  arrow_forward: (
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </>
  ),
  edit_calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h4" />
      <path d="M16 18h4" />
    </>
  ),
  inventory_2: (
    <>
      <rect x="3" y="8" width="18" height="13" rx="1" />
      <path d="M3 8V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </>
  ),
  mobile_friendly: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <line x1="11" y1="18" x2="13" y2="18" />
      <path d="m17.5 8 1.5 1.5L22 6" />
    </>
  ),
  account_balance: (
    <>
      <line x1="4" y1="21" x2="20" y2="21" />
      <line x1="6" y1="10" x2="6" y2="18" />
      <line x1="10" y1="10" x2="10" y2="18" />
      <line x1="14" y1="10" x2="14" y2="18" />
      <line x1="18" y1="10" x2="18" y2="18" />
      <polygon points="12 3 21 8 3 8" />
    </>
  ),
  check_circle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="8.5 12.5 11 15 16 9" />
    </>
  ),
  table_chart: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </>
  ),
  domain_verification: (
    <>
      <path d="M12 2 4 5v6c0 5 3.4 8.9 8 11 4.6-2.1 8-6 8-11V5l-8-3Z" />
      <polyline points="9 12 11.5 14.5 15.5 9.5" />
    </>
  ),
};

export default function Icon({ name, className = "w-6 h-6" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
