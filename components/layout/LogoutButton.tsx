"use client";

/** Shared logout action — used by the desktop sidebar (AppShell) and the mobile "7g" Menu screen. */
export default function LogoutButton({ className, children }: { className?: string; children: React.ReactNode }) {
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    // Hard navigation — see the matching note in app/login/page.tsx.
    window.location.href = "/login";
  }

  return (
    <button type="button" onClick={handleLogout} className={className}>
      {children}
    </button>
  );
}
