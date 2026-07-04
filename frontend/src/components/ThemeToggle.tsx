"use client";

import React, { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") || "dark") as "dark" | "light";
    setTheme(savedTheme);
    if (savedTheme === "light") {
      document.documentElement.classList.add("light-theme");
    } else {
      document.documentElement.classList.remove("light-theme");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "light") {
      document.documentElement.classList.add("light-theme");
    } else {
      document.documentElement.classList.remove("light-theme");
    }
    // Dispatch a custom event so other components (like charts) can listen to theme changes
    window.dispatchEvent(new Event("themechange"));
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md hover:bg-elevated text-muted hover:text-foreground transition-all cursor-pointer flex items-center justify-center border border-border-custom"
      title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
    >
      {theme === "dark" ? (
        // Sun Icon
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m12.728 12.728A9 9 0 115.636 5.636m12.728 12.728A9 9 0 015.636 5.636" />
        </svg>
      ) : (
        // Moon Icon
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}
