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
  | "lock"
  // --- extended: console emoji purge prep (HY-4) ---
  | "warning"
  | "location_pin"
  | "bolt"
  | "camera"
  | "money_bag"
  | "siren"
  | "flag_checkered"
  | "toolbox_talk"
  | "safety_vest"
  | "banknote"
  | "package"
  | "worker"
  | "inbox"
  | "clipboard"
  | "globe"
  | "outbox"
  | "ruler"
  | "tractor"
  | "fuel_pump"
  | "arrow_up"
  | "arrow_down"
  | "sun"
  | "moon"
  | "site"
  | "wrench"
  | "refresh"
  | "paperclip"
  | "envelope"
  | "trash"
  | "unlock"
  | "folder"
  | "bank"
  | "trolley"
  | "thumbs_up"
  | "tag"
  | "money_wings"
  | "test_tube"
  | "person"
  | "computer"
  | "truck"
  | "brick"
  | "memo"
  | "ledger"
  | "pencil"
  | "hammer_wrench"
  | "printer"
  | "minus"
  | "link"
  | "microphone"
  | "speaker"
  | "image"
  | "shield"
  | "hospital"
  | "headphone"
  | "megaphone"
  | "sparkles"
  | "credit_card"
  | "store"
  | "library"
  | "eye"
  | "trending_down"
  | "currency_rupee"
  | "blueprint"
  | "task_alt"
  | "clock"
  | "qr_code"
  | "cube"
  | "edit"
  | "tool"
  | "building"
  | "help"
  | "chevron_right"
  | "chevron_left"
  | "document"
  | "add";

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
      <circle cx="12" cy="12" r="9" />
      <line x1="15.5" y1="8.5" x2="8.5" y2="15.5" />
      <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
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

  // --- extended: console emoji purge prep (HY-4) ---

  // alerts/validation (replaces )
  warning: (
    <>
      <path d="M12 2 1 21h22Z" />
      <line x1="12" y1="9" x2="12" y2="14" />
      <path d="M12 17.5h.01" />
    </>
  ),
  // site geofence (replaces )
  location_pin: (
    <>
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  // quick action / high voltage (replaces )
  bolt: (
    <>
      <polygon points="13 2 3 14 11 14 10 22 21 10 13 10 13 2" />
    </>
  ),
  // photo capture (replaces )
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  // cash / cost total (replaces )
  money_bag: (
    <>
      <path d="M9 5a3 3 0 0 1 6 0c0 1.5-1 2-1 2H10s-1-.5-1-2Z" />
      <path d="M8.5 7c-3 3-4.5 6-4.5 9a6 6 0 0 0 12 0c0-3-1.5-6-4.5-9Z" />
      <path d="M12 12v5" />
    </>
  ),
  // incident alert (replaces )
  siren: (
    <>
      <path d="M12 2v3" />
      <path d="M5 21v-7a7 7 0 0 1 14 0v7Z" />
      <line x1="3" y1="21" x2="21" y2="21" />
      <line x1="12" y1="9" x2="12" y2="12" />
    </>
  ),
  // milestone (replaces )
  flag_checkered: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h6l1 2h7l-2 4 2 4h-7l-1-2H5" />
    </>
  ),
  // toolbox talk (replaces )
  toolbox_talk: (
    <>
      <circle cx="12" cy="6" r="3" />
      <path d="M6 21v-3a6 6 0 0 1 12 0v3" />
      <path d="M9 12h6" />
    </>
  ),
  // PPE / safety vest (replaces )
  safety_vest: (
    <>
      <path d="M8 3 5 6v14h4v-8h6v8h4V6l-3-3-3 2-2-2Z" />
      <line x1="10" y1="10" x2="10" y2="16" />
      <line x1="14" y1="10" x2="14" y2="16" />
    </>
  ),
  // payment / banknote (replaces )
  banknote: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="1" />
      <circle cx="12" cy="12" r="3" />
      <line x1="6" y1="9" x2="6" y2="9.01" />
      <line x1="18" y1="15" x2="18" y2="15.01" />
    </>
  ),
  // package/box (replaces )
  package: (
    <>
      <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
      <path d="m3 8 9 5 9-5" />
      <path d="M12 13v8" />
      <path d="m7 5.5 9 5" />
    </>
  ),
  // construction worker / labour (replaces )
  worker: (
    <>
      <circle cx="12" cy="6" r="3" />
      <path d="M5 21v-4a7 7 0 0 1 14 0v4" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
    </>
  ),
  // inbox / receive (replaces )
  inbox: (
    <>
      <polyline points="4 12 9 12 11 15 13 15 15 12 20 12" />
      <path d="M5.5 5h13l1.5 7v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6Z" />
    </>
  ),
  // clipboard / checklist (replaces )
  clipboard: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="1.5" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <line x1="9" y1="11" x2="15" y2="11" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </>
  ),
  // language / globe (replaces )
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />
    </>
  ),
  // outbox / send (replaces )
  outbox: (
    <>
      <polyline points="4 12 9 12 11 9 13 9 15 12 20 12" />
      <path d="M5.5 19h13l1.5-7v-6a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v6Z" />
    </>
  ),
  // drawings / triangular ruler (replaces )
  ruler: (
    <>
      <path d="M3 21 21 3" />
      <path d="M15 3h6v6" />
      <path d="M8 16l2 2" />
      <path d="M11 13l2 2" />
      <path d="M14 10l2 2" />
    </>
  ),
  // heavy equipment / tractor (replaces )
  tractor: (
    <>
      <circle cx="7" cy="18" r="3" />
      <circle cx="18" cy="18" r="2" />
      <path d="M7 15V7h4l3 5h4v3" />
      <path d="M11 15h5" />
    </>
  ),
  // fuel pump (replaces )
  fuel_pump: (
    <>
      <path d="M4 21V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14" />
      <line x1="3" y1="21" x2="13" y2="21" />
      <path d="M12 10h2l3 3v5a1.5 1.5 0 0 0 3 0v-6l-3-3" />
      <line x1="6" y1="6" x2="10" y2="6" />
    </>
  ),
  // arrow up (replaces )
  arrow_up: (
    <>
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </>
  ),
  // arrow down (replaces )
  arrow_down: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </>
  ),
  // day shift / sun (replaces )
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.2" y1="4.2" x2="5.6" y2="5.6" />
      <line x1="18.4" y1="18.4" x2="19.8" y2="19.8" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.2" y1="19.8" x2="5.6" y2="18.4" />
      <line x1="18.4" y1="5.6" x2="19.8" y2="4.2" />
    </>
  ),
  // night shift / moon (replaces )
  moon: (
    <>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </>
  ),
  // building construction / site (replaces )
  site: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V11l4-3v13" />
      <path d="M13 21V7l6-3v17" />
      <line x1="9" y1="14" x2="9" y2="14.01" />
      <line x1="17" y1="11" x2="17" y2="11.01" />
    </>
  ),
  // maintenance / wrench (replaces )
  wrench: (
    <>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.83 2.83-2.83-.83-.83-2.83Z" />
    </>
  ),
  // sync / refresh (replaces )
  refresh: (
    <>
      <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
      <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
      <polyline points="3 21 3 16 8 16" />
      <polyline points="21 3 21 8 16 8" />
    </>
  ),
  // attachment / paperclip (replaces )
  paperclip: (
    <>
      <path d="M20.5 12.2 12 20.7a4.5 4.5 0 0 1-6.4-6.4L14.1 5.8a3 3 0 0 1 4.2 4.2l-8.4 8.4a1.5 1.5 0 0 1-2.1-2.1l7.4-7.4" />
    </>
  ),
  // mail / envelope (replaces )
  envelope: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="2 6 12 13 22 6" />
    </>
  ),
  // delete / trash (replaces )
  trash: (
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </>
  ),
  // unlock (replaces )
  unlock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </>
  ),
  // folder (replaces )
  folder: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </>
  ),
  // bank (replaces )
  bank: (
    <>
      <line x1="4" y1="21" x2="20" y2="21" />
      <line x1="6" y1="10" x2="6" y2="18" />
      <line x1="10" y1="10" x2="10" y2="18" />
      <line x1="14" y1="10" x2="14" y2="18" />
      <line x1="18" y1="10" x2="18" y2="18" />
      <polygon points="12 3 21 8 3 8" />
    </>
  ),
  // procurement / shopping trolley (replaces )
  trolley: (
    <>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="17" cy="20" r="1.5" />
      <path d="M2 4h2l2.4 12.2a2 2 0 0 0 2 1.8h8.4a2 2 0 0 0 2-1.6L21 8H6" />
    </>
  ),
  // approve / thumbs up (replaces )
  thumbs_up: (
    <>
      <path d="M7 22V11" />
      <path d="M7 11l3-8a2 2 0 0 1 2 2v5h6a2 2 0 0 1 2 2.3l-1.3 7A2 2 0 0 1 17 21H7Z" />
    </>
  ),
  // tag/label (replaces )
  tag: (
    <>
      <path d="M20.6 12.6 12.6 20.6a2 2 0 0 1-2.83 0l-6.4-6.4a2 2 0 0 1 0-2.83l8-8A2 2 0 0 1 12.8 3H19a2 2 0 0 1 2 2v6.2a2 2 0 0 1-.4 1.4Z" />
      <line x1="15.5" y1="8.5" x2="15.51" y2="8.5" />
    </>
  ),
  // expense / money with wings (replaces )
  money_wings: (
    <>
      <circle cx="10" cy="12" r="6" />
      <path d="M10 9.5v5" />
      <path d="M8.2 10.5h3.6" />
      <path d="M8.2 13.5h3.6" />
      <path d="M17 6c1.5.5 2.5 2 2.5 2S18 9.5 16.5 9" />
      <path d="M19 12c1.5.3 2.5 1.6 2.5 1.6S20 15 18.5 14.7" />
    </>
  ),
  // quality lab / test tube (replaces )
  test_tube: (
    <>
      <path d="M9 2v13.5a3 3 0 0 0 6 0V2" />
      <line x1="7" y1="2" x2="17" y2="2" />
      <path d="M9 12h6" />
    </>
  ),
  // single user (replaces )
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  // computer/desktop (replaces )
  computer: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1" />
      <line x1="8" y1="20" x2="16" y2="20" />
      <line x1="12" y1="16" x2="12" y2="20" />
    </>
  ),
  // delivery / truck (replaces )
  truck: (
    <>
      <rect x="1" y="7" width="13" height="10" rx="1" />
      <path d="M14 10h4l3 3v4h-7" />
      <circle cx="6" cy="19" r="1.5" />
      <circle cx="16.5" cy="19" r="1.5" />
    </>
  ),
  // material / brick (replaces )
  brick: (
    <>
      <rect x="2" y="8" width="9" height="7" rx="0.5" />
      <rect x="13" y="8" width="9" height="7" rx="0.5" />
      <line x1="6.5" y1="8" x2="6.5" y2="15" />
      <line x1="17.5" y1="8" x2="17.5" y2="15" />
    </>
  ),
  // memo/note (replaces )
  memo: (
    <>
      <path d="M4 4h16v16H4Z" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
    </>
  ),
  // ledger/book (replaces )
  ledger: (
    <>
      <path d="M12 4a4 4 0 0 0-4-1H4v16h4a4 4 0 0 1 4 1" />
      <path d="M12 4a4 4 0 0 1 4-1h4v16h-4a4 4 0 0 0-4 1" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </>
  ),
  // pencil/edit (replaces )
  pencil: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  // tools / hammer and wrench (replaces )
  hammer_wrench: (
    <>
      <path d="m14.5 2.5 2 2-3 3 2 2 3-3 2 2a3 3 0 0 1-4 4l-8 8-3-3 8-8a3 3 0 0 1 4-4Z" />
      <path d="m4 10 3 3-4 4-3-3Z" />
    </>
  ),
  // printer (replaces )
  printer: (
    <>
      <path d="M6 9V3h12v6" />
      <rect x="4" y="9" width="16" height="8" rx="1" />
      <path d="M6 17v4h12v-4" />
    </>
  ),
  // minus (replaces )
  minus: (
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  // link (replaces )
  link: (
    <>
      <path d="M9 17H7a5 5 0 0 1 0-10h2" />
      <path d="M15 7h2a5 5 0 0 1 0 10h-2" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </>
  ),
  // microphone (replaces )
  microphone: (
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="9" y1="22" x2="15" y2="22" />
    </>
  ),
  // speaker/volume (replaces )
  speaker: (
    <>
      <polygon points="4 9 8 9 12 5 12 19 8 15 4 15 4 9" />
      <path d="M16 8a5 5 0 0 1 0 8" />
    </>
  ),
  // image/picture (replaces )
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5-9 9" />
    </>
  ),
  // safety / shield (replaces )
  shield: (
    <>
      <path d="M12 2 4 5v6c0 5 3.4 8.9 8 11 4.6-2.1 8-6 8-11V5l-8-3Z" />
    </>
  ),
  // medical / hospital (replaces )
  hospital: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </>
  ),
  // support / headphone (replaces )
  headphone: (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="2" y="14" width="4" height="6" rx="1" />
      <rect x="18" y="14" width="4" height="6" rx="1" />
    </>
  ),
  // announcement / megaphone (replaces )
  megaphone: (
    <>
      <path d="M3 11v2a1 1 0 0 0 1 1h2l9 5V5l-9 5H4a1 1 0 0 0-1 1Z" />
      <path d="M15 9a4 4 0 0 1 0 6" />
    </>
  ),
  // new / sparkles (replaces )
  sparkles: (
    <>
      <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5Z" />
      <path d="M19 15v4" />
      <path d="M17 17h4" />
    </>
  ),
  // credit card (replaces )
  credit_card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </>
  ),
  // store (replaces )
  store: (
    <>
      <path d="M3 9 4 3h16l1 6" />
      <path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" />
      <path d="M5 9v10h14V9" />
    </>
  ),
  // library/books (replaces )
  library: (
    <>
      <path d="M4 20V4h4v16" />
      <path d="M10 20V4h4v16" />
      <path d="m16.5 4 3 15.5-4 .5L12.5 4.5Z" />
    </>
  ),
  // view / eye (replaces )
  eye: (
    <>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  trending_down: (
    <>
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
      <polyline points="16 17 22 17 22 11" />
    </>
  ),
  currency_rupee: (
    <>
      <path d="M6 3h12" />
      <path d="M6 8h12" />
      <path d="m6 13 8.5 8" />
      <path d="M6 13h3a4 4 0 0 0 0-8" />
    </>
  ),
  blueprint: (
    <>
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </>
  ),
  task_alt: (
    <>
      <path d="m9 12 2 2 4-4" />
      <circle cx="12" cy="12" r="10" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  qr_code: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M14 14h3v3h-3z" />
      <path d="M20 14v3h-3" />
      <path d="M14 20h6" />
    </>
  ),
  cube: (
    <>
      <path d="m21 16-9 5-9-5V8l9-5 9 5v8Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </>
  ),
  edit: (
    <>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </>
  ),
  tool: (
    <>
      <path d="m14.7 10.7 6.3 6.3a1 1 0 0 1 0 1.4l-1.6 1.6a1 1 0 0 1-1.4 0l-6.3-6.3" />
      <path d="m4.9 19.1 6.3-6.3" />
      <path d="M8.5 7.5a4 4 0 0 1 5.6-5.6l-2.4 2.4a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l2.4-2.4a4 4 0 0 1-5.6 5.6L5.2 16.8a1 1 0 0 1-1.4 0l-1.6-1.6a1 1 0 0 1 0-1.4Z" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </>
  ),
  chevron_right: (
    <polyline points="9 18 15 12 9 6" />
  ),
  chevron_left: (
    <polyline points="15 18 9 12 15 6" />
  ),
  document: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </>
  ),
  add: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
};

// Fallback glyph for unrecognised icon names.
// INCIDENT: a data source once held icon KEYS (e.g. "plug", "chat_bubble")
// while the render site did `{item.icon}` as raw text -- when the mapping
// drifted, users saw literal strings like "plug" rendered on the integrations
// page in production. This fallback makes that class of bug structurally
// impossible: an unknown `name` always renders a neutral glyph, never text.
const FALLBACK_ICON: React.ReactNode = (
  <>
    <rect x="5" y="5" width="14" height="14" rx="2" />
    <circle cx="12" cy="12" r="1.5" />
  </>
);

const warnedUnknownNames = new Set<string>();

export default function Icon({ name, className = "w-6 h-6" }: IconProps) {
  const path = ICON_PATHS[name];

  if (!path && process.env.NODE_ENV !== "production" && !warnedUnknownNames.has(name)) {
    warnedUnknownNames.add(name);
    // eslint-disable-next-line no-console
    console.warn(`[Icon] unknown icon name: "${name}"`);
  }

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
      {path ?? FALLBACK_ICON}
    </svg>
  );
}




