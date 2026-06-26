import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "SiteFlow | Premium Construction Management & Operations Portal",
  description: "Next-generation site tracking, resource coordination, and real-time ledger sync.",
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
      </body>
    </html>
  );
}
