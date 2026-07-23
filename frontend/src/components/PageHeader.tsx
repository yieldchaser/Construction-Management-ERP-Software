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

interface Notification {
  id: string;
  title: string;
  body: string;
  ts: string;
  read: boolean;
}

const STORAGE_KEY = "siteflow_notifications";

const seedNotifications = (): Notification[] => [
  {
    id: "welcome",
    title: "Welcome to SiteFlow",
    body: "Your construction workspace is ready. Use the sidebar to jump into modules.",
    ts: "Just now",
    read: false,
  },
];

export default function PageHeader({ title, children }: PageHeaderProps) {
  const router = useRouter();
  const params = useParams();
  const { toggleMobile } = useSidebar();
  const rawCompanyId = params?.company_id as string;
  const companyId = rawCompanyId === "e0000000-0000-0000-0000-000000000000"
    ? "demo-construction"
    : (rawCompanyId || (typeof window !== "undefined" ? localStorage.getItem("company_id") : null) || "demo-construction");

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let initial: Notification[] = seedNotifications();
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) initial = parsed;
      } else if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      }
    } catch {
      // Ignore malformed storage
    }
    setNotifications(initial);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    }
  }, [notifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

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
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setNotifOpen((o) => !o);
                setUserOpen(false);
              }}
              className="p-2 rounded-md hover:bg-elevated text-muted hover:text-foreground transition-all cursor-pointer relative"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-3.5 px-1 flex items-center justify-center text-[9px] font-bold text-white bg-danger rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-card border border-border-custom rounded-lg shadow-xl z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-custom">
                  <span className="text-sm font-semibold text-foreground">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-muted">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="flex items-start gap-2 px-4 py-3 border-b border-border-custom last:border-0 hover:bg-elevated transition-colors"
                      >
                        {!n.read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-danger" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-foreground">{n.title}</div>
                          <div className="text-[11px] text-muted mt-0.5">{n.body}</div>
                          <div className="text-[10px] text-muted mt-1">{n.ts}</div>
                        </div>
                        <button
                          onClick={() => dismissNotification(n.id)}
                          className="text-muted hover:text-danger text-xs shrink-0"
                          aria-label="Dismiss"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <ThemeToggle />

          {/* User Profile Info */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => {
                setUserOpen((o) => !o);
                setNotifOpen(false);
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
