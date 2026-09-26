export type NavStatus = "ready" | "soon";

export type NavItem = {
  id: string;
  label: string;
  icon: IconName;
  status: NavStatus;
  href?: string;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

export type IconName =
  | "overview"
  | "place"
  | "event"
  | "experience"
  | "category"
  | "provider"
  | "destination"
  | "users"
  | "content"
  | "recommendations"
  | "moderation"
  | "analytics"
  | "settings"
  | "permissions"
  | "audit"
  | "search"
  | "bell"
  | "menu";

export const navigation: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [{ id: "dashboard", label: "Overview", icon: "overview", status: "ready", href: "/admin" }],
  },
  {
    id: "discovery",
    label: "Discovery",
    items: [
      { id: "places", label: "Places", icon: "place", status: "ready", href: "/admin/places" },
      { id: "events", label: "Events", icon: "event", status: "soon" },
      { id: "experiences", label: "Experiences", icon: "experience", status: "soon" },
      { id: "categories", label: "Categories", icon: "category", status: "soon" },
    ],
  },
  {
    id: "providers",
    label: "Providers",
    items: [
      { id: "provider-list", label: "Providers", icon: "provider", status: "soon" },
      { id: "destinations", label: "Destinations", icon: "destination", status: "soon" },
    ],
  },
  {
    id: "people",
    label: "Directory",
    items: [
      { id: "users", label: "Users", icon: "users", status: "soon" },
      { id: "content", label: "Content", icon: "content", status: "soon" },
      { id: "recommendations", label: "Recommendations", icon: "recommendations", status: "soon" },
      { id: "moderation", label: "Moderation", icon: "moderation", status: "soon" },
      { id: "analytics", label: "Analytics", icon: "analytics", status: "soon" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { id: "settings", label: "Settings", icon: "settings", status: "soon" },
      { id: "permissions", label: "Permissions", icon: "permissions", status: "soon" },
      { id: "audit", label: "Audit log", icon: "audit", status: "soon" },
    ],
  },
];

export function readyHrefs(groups: NavGroup[] = navigation): string[] {
  return groups.flatMap((group) => group.items.flatMap((item) => (item.status === "ready" && item.href ? [item.href] : [])));
}
