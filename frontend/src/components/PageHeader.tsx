"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

import { useSidebar } from "@/context/SidebarContext";

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export default function PageHeader({ title, children }: PageHeaderProps) {
  const router = useRouter();
  const params = useParams();
  const { toggleMobile } = useSidebar();
  const companyId = params?.company_id as string;

  useEffect(() => {
    if (!companyId) {
      router.replace("/login");
    }
  }, [companyId, router]);

  const [userOpen, setUserOpen] = useState(false);

  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    const keys = [
      "access_token",
      "company_id",
      "user_id",
      "user_name",
      "creator_name",
      "company_name",
      "last_project_id",
    ];
    keys.forEach((k) => localStorage.removeItem(k));
    router.push("/login");
  };

  return (
    <header className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border-custom bg-card flex justify-between items-center shrink-0">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleMobile}
          className="lg:hidden p-1.5 rounded-md bg-elevated text-foreground hover:text-primary transition-colors cursor-pointer"
          aria-label="Toggle navigation drawer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Children slots for filters or buttons specific to page */}
        {children && <div className="flex items-center gap-3">{children}</div>}

        {/* Universal Tools */}
        <div className="flex items-center gap-3 pl-3 border-l border-border-custom">
          <ThemeToggle />

          {/* User Profile Info */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => {
                setUserOpen((o) => !o);
              }}
              className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold uppercase hover:bg-primary/90 transition-all cursor-pointer"
            >
              U
            </button>

            {userOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border-custom rounded-lg shadow-xl z-50">
                <div className="px-4 py-3 border-b border-border-custom">
                  <div className="text-xs font-semibold text-foreground truncate">
                    {typeof window !== "undefined" ? localStorage.getItem("user_name") || "User" : "User"}
                  </div>
                </div>
                <div className="py-1">
                  <Link
                    href={`/c/${companyId}/settings`}
                    onClick={() => setUserOpen(false)}
                    className="block px-4 py-2 text-xs text-muted hover:text-foreground hover:bg-elevated transition-colors"
                  >
                    Profile &amp; Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-xs text-danger hover:bg-elevated transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
