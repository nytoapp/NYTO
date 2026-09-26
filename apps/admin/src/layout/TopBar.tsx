import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/ui/Icon";
import { Breadcrumb, Button, Dialog, EmptyState } from "../components/ui/primitives";
import { useToast } from "../components/ui/toast";
import { createApiClient } from "../services/api";
import { useSession } from "../features/auth/session-context";

export function TopBar({ section, onOpenNav }: { section: string; onOpenNav: () => void }) {
  return (
    <header className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <button type="button" className="icon-btn menu-btn" aria-label="Open navigation" onClick={onOpenNav}>
          <Icon name="menu" />
        </button>
        <Breadcrumb section={section} />
      </div>
      <div className="top-actions">
        <SearchTrigger />
        <Notifications />
        <AccountMenu />
      </div>
    </header>
  );
}

function SearchTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn" aria-label="Search" aria-expanded={open} onClick={() => setOpen(true)}>
        <Icon name="search" />
      </button>
      <Dialog open={open} title="Search" onClose={() => setOpen(false)}>
        <p className="muted">Admin search is not connected. It will search places, events, and providers when that index exists.</p>
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>
        </div>
      </Dialog>
    </>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <div className="menu-anchor" ref={ref}>
      <button type="button" className="icon-btn" aria-label="Notifications" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Icon name="bell" />
      </button>
      {open ? (
        <div className="notice-pop" role="dialog" aria-label="Notifications">
          <EmptyState title="No notifications" body="Operational alerts will show here when a notification source is connected. Nothing is stored for this yet." />
        </div>
      ) : null}
    </div>
  );
}

function AccountMenu() {
  const { session, clear } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (!session) {
      return;
    }
    setBusy(true);
    try {
      await createApiClient(() => session.accessToken).request("/api/v1/auth/logout", { method: "POST" });
    } catch {
      toast("Signed out on this browser. The server session may remain until the access token expires.");
    } finally {
      clear();
      setBusy(false);
      setConfirm(false);
      navigate("/admin/login", { replace: true });
    }
  }

  return (
    <div className="menu-anchor">
      <button type="button" className="btn secondary" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((value) => !value)}>
        Account
      </button>
      {open ? (
        <div className="menu" role="menu">
          <button type="button" className="menu-item" role="menuitem" aria-disabled="true" onClick={(event) => event.preventDefault()}>Profile · Soon</button>
          <button type="button" className="menu-item" role="menuitem" aria-disabled="true" onClick={(event) => event.preventDefault()}>Preferences · Soon</button>
          <button type="button" className="menu-item" role="menuitem" onClick={() => { setOpen(false); setConfirm(true); }}>Sign out</button>
        </div>
      ) : null}
      <Dialog open={confirm} title="Sign out" onClose={() => setConfirm(false)}>
        <p className="muted">This ends the operations session on the server and on this browser.</p>
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button>
          <Button onClick={() => void signOut()} disabled={busy}>{busy ? "Signing out" : "Sign out"}</Button>
        </div>
      </Dialog>
    </div>
  );
}
