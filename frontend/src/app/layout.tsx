import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import PwaBootstrap from "@/components/pwa/PwaBootstrap";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "SiteFlow | Premium Construction Management & Operations Portal",
  description: "Next-generation site tracking, resource coordination, and real-time ledger sync.",
  manifest: "/manifest.json",
  applicationName: "SiteFlow",
  appleWebApp: {
    capable: true,
    title: "SiteFlow",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#E8184C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#0E0C15] text-[#ededed] font-sans">
        {children}
        <PwaBootstrap />
      </body>
    </html>
  );
}

// Trigger Vercel rebuild to apply environment variables
