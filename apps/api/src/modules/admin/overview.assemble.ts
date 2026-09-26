import { adminOverviewSchema, ErrorCodes, type AdminOverview, type CatalogKind } from "@atlas/contracts";
import { AppError } from "../../shared/http/app-error";

const SOURCE_NOTE =
  "Counts are queried from the application database. A development database includes fixture seed rows. Search volume and provider latency are not stored.";

export type OverviewCounts = {
  places: number;
  events: number;
  providers: number;
  users: number;
  saves: number;
  trips: number;
};

export type OverviewCategory = { slug: string; label: string; subjectCount: number };
export type OverviewSubject = { id: string; kind: string; title: string; createdAt: string };
export type OverviewProvider = { code: string; name: string; status: "active" | "disabled" };
export type OverviewActivity = { id: string; occurredAt: string; action: string; targetType: string };

export function assembleOverview(
  input: {
    counts: OverviewCounts;
    categories: OverviewCategory[];
    recentSubjects: OverviewSubject[];
    providers: OverviewProvider[];
    activity: OverviewActivity[];
  },
  generatedAt: Date,
): AdminOverview {
  const catalogKinds = new Set<CatalogKind>(["place", "accommodation", "event", "experience", "activity", "media"]);
  const overview = {
    generatedAt: generatedAt.toISOString(),
    sourceNote: SOURCE_NOTE,
    metrics: [
      live("places", "Places", input.counts.places),
      live("events", "Active events", input.counts.events),
      live("providers", "Active providers", input.counts.providers),
      live("users", "Registered users", input.counts.users),
      {
        key: "searches" as const,
        label: "Searches",
        value: null,
        availability: "unavailable" as const,
        note: "Search volume is not stored.",
      },
      live("saves", "Saves", input.counts.saves),
      live("trips", "Trips", input.counts.trips),
    ],
    categories: input.categories.slice(0, 8),
    recentSubjects: input.recentSubjects.slice(0, 8).flatMap((subject) => {
      if (!catalogKinds.has(subject.kind as CatalogKind)) {
        return [];
      }
      return [{ ...subject, kind: subject.kind as CatalogKind }];
    }),
    providers: input.providers.slice(0, 50).map((provider) => ({
      code: provider.code,
      name: provider.name,
      status: provider.status,
      latencyMs: null,
      lastSuccessAt: null,
      telemetry: "unavailable" as const,
    })),
    activity: input.activity.slice(0, 12),
    alerts: input.providers
      .filter((provider) => provider.status === "disabled")
      .slice(0, 20)
      .map((provider) => ({
        code: `provider_disabled:${provider.code}`,
        severity: "attention" as const,
        message: `${provider.name} is disabled.`,
      })),
  };
  const parsed = adminOverviewSchema.safeParse(overview);
  if (!parsed.success) {
    throw new AppError(ErrorCodes.INTERNAL, "The request could not be completed.", 500, true);
  }
  return parsed.data;
}

function live(key: "places" | "events" | "providers" | "users" | "saves" | "trips", label: string, value: number) {
  return { key, label, value, availability: "live" as const, note: null };
}
