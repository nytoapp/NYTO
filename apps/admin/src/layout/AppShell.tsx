import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  const section = location.pathname === "/admin" ? "Overview" : location.pathname.startsWith("/admin/places") ? "Places" : "Unavailable";
  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to content</a>
      {navOpen ? <button type="button" className="drawer-scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} /> : null}
      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
      <div className="workspace">
        <TopBar section={section} onOpenNav={() => setNavOpen(true)} />
        <main id="main" className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
