import type { Metadata } from "next";
import PricingClient from "./PricingClient";

export const metadata: Metadata = {
  title: "SiteFlow Pricing - Transparent Construction ERP Plans",
  description:
    "Simple, transparent pricing for contractors and builders of all sizes. Choose from Starter, Growth, and Enterprise tiers with no hidden fees.",
};

export default function PricingPage() {
  return <PricingClient />;
}
