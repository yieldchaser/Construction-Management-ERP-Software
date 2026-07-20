export type IconName =
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
  | "domain_verification"
  // --- extended: help categories + marketing glyphs (HY-3 emoji purge) ---
  | "rocket"
  | "calendar"
  | "description"
  | "payments"
  | "domain"
  | "handshake"
  | "architecture_drawing"
  | "trending_up"
  | "smartphone"
  | "inventory"
  | "construction"
  | "bar_chart"
  | "settings"
  | "check"
  | "group"
  | "home"
  | "house"
  | "factory"
  | "plug"
  | "chat_bubble"
  | "briefcase"
  | "cloud_drive"
  | "book"
  | "search"
  | "close_circle"
  | "star"
  | "arrow_right"
  | "arrow_left"
  | "chevron_down"
  | "note"
  | "dashboard"
  | "receipt"
  | "schedule"
  | "lock";

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
      <polyline points="8.5 12.5 11 15 16 9.5" />
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

  // --- extended glyphs (HY-3 emoji purge) ---

  // getting-started (replaces rocket emoji)
  rocket: (
    <>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z" />
      <path d="M12 15l-3-3a22 22 0 0 1 8-11 6.5 6.5 0 0 1 0 13 22 22 0 0 1-5 1Z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </>
  ),
  // attendance-payroll (replaces emoji)
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
    </>
  ),
  // billing-invoicing (replaces emoji)
  description: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
      <line x1="8" y1="9" x2="10" y2="9" />
    </>
  ),
  // budgeting-cost-control (replaces emoji)
  payments: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <circle cx="16" cy="14" r="1.5" />
    </>
  ),
  // company-features (replaces emoji)
  domain: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="21" x2="9" y2="3" />
      <line x1="15" y1="21" x2="15" y2="3" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
    </>
  ),
  // crm-leads (replaces emoji)
  handshake: (
    <>
      <path d="m11 17 2 2a1 1 0 0 0 3-3" />
      <path d="m14 14 2.5 2.5a1 1 0 0 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 0 1-1.41 0l-2-2a2 2 0 0 1 2.83-2.83l.5.5" />
      <path d="m8 14 1.5 1.5a1 1 0 0 1-3 3l-3.5-3.5a1 1 0 0 1 0-1.41l2-2" />
    </>
  ),
  // design-files (replaces emoji)
  architecture_drawing: (
    <>
      <path d="M3 3v18" />
      <path d="M3 21h18" />
      <path d="m7 17 4-10 4 10" />
      <path d="M7.5 13h7" />
    </>
  ),
  // finance-transactions (replaces emoji)
  trending_up: (
    <>
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="15 7 21 7 21 13" />
    </>
  ),
  // mobile-app (replaces emoji)
  smartphone: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </>
  ),
  // procurement-warehouse (replaces emoji)
  inventory: (
    <>
      <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
      <path d="m3 8 9 5 9-5" />
      <line x1="12" y1="13" x2="12" y2="21" />
    </>
  ),
  // project-management 
  construction: (
    <>
      <path d="M2 20h20" />
      <path d="M4 20V9l8-5 8 5v11" />
      <path d="M9 20v-6h6v6" />
      <path d="M2 9l10-6 10 6" />
    </>
  ),
  // reports (replaces emoji)
  bar_chart: (
    <>
      <line x1="4" y1="20" x2="20" y2="20" />
      <rect x="6" y="11" width="3" height="6" rx="0.5" />
      <rect x="11" y="7" width="3" height="10" rx="0.5" />
      <rect x="16" y="13" width="3" height="4" rx="0.5" />
    </>
  ),
  // settings-configuration 
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </>
  ),
  // tasks-to-dos (replaces emoji)
  check: (
    <>
      <polyline points="20 6 9 17 4 12" />
    </>
  ),
  // user-management (replaces emoji)
  group: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.5" />
      <path d="M17 14a6 6 0 0 1 4 6" />
    </>
  ),
  // who-we-serve: builders (replaces emoji)
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9 21v-6h6v6" />
    </>
  ),
  // who-we-serve: interior (replaces emoji)
  house: (
    <>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  // who-we-serve: infrastructure (replaces emoji)
  factory: (
    <>
      <path d="M3 21V9l6 4V9l6 4V8l6 4v9Z" />
      <line x1="3" y1="21" x2="21" y2="21" />
      <line x1="9" y1="13" x2="9" y2="21" />
      <line x1="15" y1="13" x2="15" y2="21" />
    </>
  ),
  // integrations: Tally (replaces emoji)
  plug: (
    <>
      <path d="M9 2v6" />
      <path d="M15 2v6" />
      <path d="M7 8h10v3a5 5 0 0 1-10 0Z" />
      <path d="M12 16v6" />
    </>
  ),
  // integrations: WhatsApp (replaces emoji)
  chat_bubble: (
    <>
      <path d="M21 11.5a8.38 8.38 0 0 1-9 8.5 9.5 9.5 0 0 1-4-1L3 20l1.5-4.5a8.5 8.5 0 1 1 16.5-4Z" />
      <line x1="8.5" y1="11" x2="15.5" y2="11" />
      <line x1="8.5" y1="14" x2="13" y2="14" />
    </>
  ),
  // integrations: Zoho (replaces emoji)
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </>
  ),
  // integrations: Google Drive (replaces emoji)
  cloud_drive: (
    <>
      <path d="M6 16a4 4 0 0 1-.5-7.97A5 5 0 0 1 15 8.5a3.5 3.5 0 0 1 1 6.86" />
      <path d="M9 14.5 12 18l3-3.5" />
    </>
  ),
  // knowledge base eyebrow (replaces emoji)
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </>
  ),
  // search (replaces emoji)
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  // close/remove (replaces emoji)
  close_circle: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  // star rating (replaces emoji)
  star: (
    <>
      <polygon points="12 3 14.9 9.2 21.5 10.1 16.8 14.8 17.9 21.4 12 18.2 6.1 21.4 7.2 14.8 2.5 10.1 9.1 9.2 12 3" />
    </>
  ),
  // arrow right (replaces emoji)
  arrow_right: (
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </>
  ),
  // arrow left (replaces emoji)
  arrow_left: (
    <>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </>
  ),
  // chevron down (replaces emoji)
  chevron_down: (
    <>
      <polyline points="6 9 12 15 18 9" />
    </>
  ),
  // note (replaces emoji)
  note: (
    <>
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </>
  ),
  // console dashboard fallback (was -like)
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  // receipt (was  in article lists)
  receipt: (
    <>
      <path d="M5 3v18l2-1.5L9 21l2-1.5L13 21l2-1.5L17 21l2-1.5V3l-2 1.5L15 3l-2 1.5L11 3 9 4.5 7 3Z" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </>
  ),
  schedule: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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




