import type { Metadata, Viewport } from "next";
import { Inter, Noto_Serif, Public_Sans } from "next/font/google";
import "./globals.css";
import PwaBootstrap from "@/components/pwa/PwaBootstrap";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-serif",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-label",
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
    <html lang="en" className={`${inter.variable} ${notoSerif.variable} ${publicSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
        <PwaBootstrap />
      </body>
    </html>
  );
}

// Trigger Vercel rebuild for Render backend URL updated
