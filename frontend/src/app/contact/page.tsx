import type { Metadata } from "next";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact SiteFlow - Sales, Support & Product Inquiries",
  description:
    "Get in touch with the SiteFlow team for product demos, enterprise deployments, onboarding support, and general inquiries.",
};

export default function ContactPage() {
  return <ContactClient />;
}
