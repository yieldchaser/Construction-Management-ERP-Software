"use client";

import React from "react";
import ThemeToggle from "./ThemeToggle";

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export default function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="px-6 py-4 border-b border-border-custom bg-card flex justify-between items-center shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Children slots for filters or buttons specific to page */}
        {children && <div className="flex items-center gap-3">{children}</div>}
        
        {/* Universal Tools */}
        <div className="flex items-center gap-3 pl-3 border-l border-border-custom">
          {/* Notification Bell */}
          <button className="p-2 rounded-md hover:bg-elevated text-muted hover:text-foreground transition-all cursor-pointer relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-danger rounded-full" />
          </button>
          
          <ThemeToggle />
          
          {/* User Profile Info */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold uppercase">
              U
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
