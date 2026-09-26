import { useQuery } from "@tanstack/react-query";
import type { AdminOverview } from "@atlas/contracts";
import { EmptyState, ErrorState, Skeleton, StatusPill } from "../../components/ui/primitives";
import { useSession } from "../auth/session-context";
import { createApiClient, ApiRequestError } from "../../services/api";

export function DashboardPage() {
  const { session } = useSession();
  const overview = useQuery({
    queryKey: ["admin", "overview", session?.userId],
    enabled: Boolean(session),
    queryFn: () => createApiClient(() => session?.accessToken ?? null).request<AdminOverview>("/api/v1/admin/overview"),
  });

  return (
    <div className="stack">
      <header>
        <h1 className="page-title">Overview</h1>
        <p className="page-intro muted">What the platform can report from the database right now.</p>
      </header>
      {overview.isLoading ? <DashboardSkeleton /> : null}
      {overview.isError ? (
        <ErrorState
          title="Overview could not be loaded"
          body={overview.error instanceof ApiRequestError ? withReference(overview.error) : "Try again."}
          onRetry={() => void overview.refetch()}
        />
      ) : null}
      {overview.data ? <OverviewBody data={overview.data} /> : null}
    </div>
  );
}

function OverviewBody({ data }: { data: AdminOverview }) {
  return (
    <>
      <p className="source-note">{data.sourceNote}</p>
      <section className="metric-grid" aria-label="Operational metrics">
        {data.metrics.map((metric) => (
          <article className="panel" key={metric.key}>
            <p className="meta">{metric.label}</p>
            {metric.availability === "live" && metric.value !== null ? (
              <p className="metric-value">{metric.value.toLocaleString()}</p>
            ) : (
              <p className="metric-value is-unavailable">Unavailable</p>
            )}
            {metric.note ? <p className="meta">{metric.note}</p> : <p className="meta">Database count</p>}
          </article>
        ))}
      </section>
      <div className="split">
        <Discovery data={data} />
        <Providers data={data} />
      </div>
      <div className="split">
        <Activity data={data} />
        <Alerts data={data} />
      </div>
    </>
  );
}

function Discovery({ data }: { data: AdminOverview }) {
  return (
    <section className="panel" aria-labelledby="discovery-heading">
      <div className="panel-head">
        <h2 id="discovery-heading">Discovery activity</h2>
      </div>
      <p className="meta">Recent searches are not stored, so this section shows catalog records only.</p>
      <h3 className="meta" style={{ marginTop: 16 }}>Categories</h3>
      {data.categories.length === 0 ? (
        <EmptyState title="No categories" body="The catalog has no active categories yet. They will appear here after catalog data is loaded." />
      ) : (
        <div className="list">
          {data.categories.map((category) => (
            <div className="list-row" key={category.slug}>
              <span>{category.label}</span>
              <span className="meta">{category.subjectCount} subjects</span>
            </div>
          ))}
        </div>
      )}
      <h3 className="meta" style={{ marginTop: 16 }}>Recently added</h3>
      {data.recentSubjects.length === 0 ? (
        <EmptyState title="No catalog records" body="Active places, events, and other subjects will be listed here after they exist in the database." />
      ) : (
        <div className="list">
          {data.recentSubjects.map((subject) => (
            <div className="list-row" key={subject.id}>
              <span>{subject.title}</span>
              <span className="meta">{subject.kind} · {formatWhen(subject.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Providers({ data }: { data: AdminOverview }) {
  return (
    <section className="panel" aria-labelledby="providers-heading">
      <div className="panel-head">
        <h2 id="providers-heading">Provider health</h2>
        <span className="meta">Latency is not recorded</span>
      </div>
      {data.providers.length === 0 ? (
        <EmptyState title="No providers" body="Registered providers will appear here with their stored status. Latency and last success are not collected yet." />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Status</th>
              <th>Last success</th>
              <th>Latency</th>
            </tr>
          </thead>
          <tbody>
            {data.providers.map((provider) => (
              <tr key={provider.code}>
                <td data-label="Provider">{provider.name}</td>
                <td data-label="Status">
                  <StatusPill tone={provider.status === "active" ? "ok" : "warn"}>{provider.status === "active" ? "Active" : "Disabled"}</StatusPill>
                </td>
                <td data-label="Last success">Not recorded</td>
                <td data-label="Latency">Not recorded</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Activity({ data }: { data: AdminOverview }) {
  return (
    <section className="panel" aria-labelledby="activity-heading">
      <div className="panel-head">
        <h2 id="activity-heading">Recent activity</h2>
      </div>
      {data.activity.length === 0 ? (
        <EmptyState title="No audited events" body="Sign-in and other audited actions will appear here. The audit log is empty for this database." />
      ) : (
        <div className="list">
          {data.activity.map((item) => (
            <div className="list-row" key={item.id}>
              <span>{item.action}</span>
              <span className="meta">{item.targetType} · {formatWhen(item.occurredAt)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Alerts({ data }: { data: AdminOverview }) {
  return (
    <section className="panel" aria-labelledby="alerts-heading">
      <div className="panel-head">
        <h2 id="alerts-heading">Operational alerts</h2>
      </div>
      {data.alerts.length === 0 ? (
        <EmptyState title="No alerts" body="Disabled providers are the only alert the database can raise today. Moderation and sync failures are not recorded yet." />
      ) : (
        <div className="list">
          {data.alerts.map((alert) => (
            <div className="list-row" key={alert.code}>
              <span>{alert.message}</span>
              <StatusPill tone="warn">Attention</StatusPill>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading overview">
      <Skeleton height={48} />
      <div className="metric-grid">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} height={96} />)}
      </div>
      <div className="split">
        <Skeleton height={180} />
        <Skeleton height={180} />
      </div>
    </div>
  );
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function withReference(error: ApiRequestError): string {
  return error.requestId && error.requestId !== "unavailable" ? `${error.message} Reference ${error.requestId}.` : error.message;
}
