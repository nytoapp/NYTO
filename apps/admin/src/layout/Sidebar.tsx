import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Icon } from "../components/ui/Icon";
import { navigation, type NavItem } from "../lib/navigation";

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  return (
    <aside className={open ? "sidebar is-open" : "sidebar"} aria-label="Primary">
      <div className="brand">
        <Icon name="overview" />
        <span>Operations</span>
      </div>
      <nav className="nav-scroll">
        {navigation.map((group) => (
          <div className="nav-group" key={group.id}>
            <p className="nav-label-group">{group.label}</p>
            {group.items.map((item) => (
              <NavEntry key={item.id} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>
      <CollapseControl />
    </aside>
  );
}

function NavEntry({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  if (item.status === "ready" && item.href) {
    return (
      <NavLink className="nav-item" to={item.href} end aria-label={item.label} title={item.label} onClick={onNavigate}>
        <Icon name={item.icon} />
        <span className="nav-label">{item.label}</span>
      </NavLink>
    );
  }
  return (
    <span className="nav-soon-wrap" title={`${item.label} is not available yet`}>
      <button type="button" className="nav-item is-soon" aria-disabled="true" onClick={(event) => event.preventDefault()}>
        <Icon name={item.icon} />
        <span className="nav-label">{item.label}</span>
        <span className="nav-soon">Soon</span>
      </button>
    </span>
  );
}

function CollapseControl() {
  const [collapsed, setCollapsed] = useState(() => document.documentElement.dataset.nav === "collapsed");
  return (
    <button
      type="button"
      className="collapse-btn"
      aria-pressed={collapsed}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      onClick={() => {
        const next = !collapsed;
        setCollapsed(next);
        if (next) {
          document.documentElement.dataset.nav = "collapsed";
          localStorage.setItem("ops.nav.collapsed", "1");
        } else {
          delete document.documentElement.dataset.nav;
          localStorage.setItem("ops.nav.collapsed", "0");
        }
      }}
    >
      <span>{collapsed ? "Expand" : "Collapse"}</span>
    </button>
  );
}
