import type { IconName } from "../../lib/navigation";

const paths: Record<IconName, string> = {
  overview: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  place: "M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z M12 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  event: "M5 5h14v14H5z M8 3v4M16 3v4M5 9h14",
  experience: "M12 3l2.2 4.6L19 8.2l-3.5 3.4.8 4.9L12 14.8 7.7 16.5l.8-4.9L5 8.2l4.8-.6z",
  category: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 15h7",
  provider: "M4 8h16v10H4z M8 8V6h8v2",
  destination: "M5 12h10M13 8l4 4-4 4",
  users: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 19c.6-2.4 2.5-4 5-4s4.4 1.6 5 4M16 11a2.5 2.5 0 1 0 0-5M17 15c1.8.3 3.2 1.6 3.8 4",
  content: "M6 4h9l3 3v13H6z M15 4v3h3",
  recommendations: "M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5",
  moderation: "M12 3l7 3v6c0 4.2-2.8 7.2-7 9-4.2-1.8-7-4.8-7-9V6z",
  analytics: "M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-3",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M4 12h2M18 12h2M12 4v2M12 18v2",
  permissions: "M8 11V8a4 4 0 0 1 8 0v3 M6 11h12v9H6z",
  audit: "M7 4h10v16H7z M10 8h4M10 12h4M10 16h2",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M16 16l4 4",
  bell: "M6 16h12l-1.2-2.2V10a4.8 4.8 0 0 0-9.6 0v3.8z M10 16a2 2 0 0 0 4 0",
  menu: "M4 7h16M4 12h16M4 17h16",
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d={paths[name]} />
    </svg>
  );
}
