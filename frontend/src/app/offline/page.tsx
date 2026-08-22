import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "You are offline | SiteFlow",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center text-neutral-900">
      <h1 className="text-2xl font-semibold">You are offline</h1>
      <p className="max-w-md text-sm leading-relaxed text-neutral-600">
        SiteFlow could not reach the network, so this page cannot load. Check your
        connection and try again. Pages you visited recently may still open from
        your device.
      </p>
      <Link
        href="/"
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Retry
      </Link>
    </main>
  );
}
