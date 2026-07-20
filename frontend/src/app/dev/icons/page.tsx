import Icon, { type IconName } from "@/components/marketing/Icon";

// Internal development reference only. Not linked from any user-facing
// navigation. Renders the full stroke-icon set (marketing + console-purge
// additions) so the set can be eyeballed for consistency before the
// app/c/** emoji conversion begins.

const MARKETING_ICONS: IconName[] = [
  "architecture",
  "menu",
  "close",
  "arrow_forward",
  "edit_calendar",
  "inventory_2",
  "mobile_friendly",
  "account_balance",
  "check_circle",
  "table_chart",
  "domain_verification",
  "rocket",
  "calendar",
  "description",
  "payments",
  "domain",
  "handshake",
  "architecture_drawing",
  "trending_up",
  "smartphone",
  "inventory",
  "construction",
  "bar_chart",
  "settings",
  "check",
  "group",
  "home",
  "house",
  "factory",
  "plug",
  "chat_bubble",
  "briefcase",
  "cloud_drive",
  "book",
  "search",
  "close_circle",
  "star",
  "arrow_right",
  "arrow_left",
  "chevron_down",
  "note",
  "dashboard",
  "receipt",
  "schedule",
  "lock",
];

const CONSOLE_ICONS: IconName[] = [
  "warning",
  "location_pin",
  "bolt",
  "camera",
  "money_bag",
  "siren",
  "flag_checkered",
  "toolbox_talk",
  "safety_vest",
  "banknote",
  "package",
  "worker",
  "inbox",
  "clipboard",
  "globe",
  "outbox",
  "ruler",
  "tractor",
  "fuel_pump",
  "arrow_up",
  "arrow_down",
  "sun",
  "moon",
  "site",
  "wrench",
  "refresh",
  "paperclip",
  "envelope",
  "trash",
  "unlock",
  "folder",
  "bank",
  "trolley",
  "thumbs_up",
  "tag",
  "money_wings",
  "test_tube",
  "person",
  "computer",
  "truck",
  "brick",
  "memo",
  "ledger",
  "pencil",
  "hammer_wrench",
  "printer",
  "minus",
  "link",
  "microphone",
  "speaker",
  "image",
  "shield",
  "hospital",
  "headphone",
  "megaphone",
  "sparkles",
  "credit_card",
  "store",
  "library",
  "eye",
];

function IconCell({ name }: { name: IconName }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-current/10 p-3">
      <div className="flex items-end gap-3">
        <Icon name={name} className="w-4 h-4" />
        <Icon name={name} className="w-6 h-6" />
        <Icon name={name} className="w-9 h-9" />
      </div>
      <span className="text-center text-[11px] font-mono opacity-70 break-all">{name}</span>
    </div>
  );
}

function IconGrid({ names }: { names: IconName[] }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
      {names.map((name) => (
        <IconCell key={name} name={name} />
      ))}
    </div>
  );
}

export default function IconSheetPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">
          Internal development reference
        </p>
        <h1 className="text-2xl font-semibold">Icon sheet</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Every icon in the stroke-icon set (`frontend/src/components/marketing/Icon.tsx`),
          shown in three sizes on both light and dark backgrounds for stroke-weight review.
          This page is not linked from any product navigation and is not part of the marketing
          site or console.
        </p>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Marketing icons ({MARKETING_ICONS.length})</h2>
          <p className="mb-4 text-sm text-neutral-500">Existing set, shipped on the marketing site.</p>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <IconGrid names={MARKETING_ICONS} />
          </div>
          <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-white">
            <IconGrid names={MARKETING_ICONS} />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Console icons ({CONSOLE_ICONS.length})</h2>
          <p className="mb-4 text-sm text-neutral-500">
            New additions for the app/c/** emoji purge, not yet wired into any page.
          </p>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <IconGrid names={CONSOLE_ICONS} />
          </div>
          <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-white">
            <IconGrid names={CONSOLE_ICONS} />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Unknown-name fallback</h2>
          <p className="mb-4 text-sm text-neutral-500">
            What renders when a data source passes an icon name that is not in the set
            (dev console will also warn once per name).
          </p>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <IconGrid names={["this_name_does_not_exist" as IconName]} />
          </div>
        </section>
      </div>
    </div>
  );
}
