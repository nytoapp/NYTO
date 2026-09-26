import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { PlaceCategoryOption, PlaceListResponse } from "@atlas/contracts";
import { Button, Dialog, EmptyState, ErrorState, Pagination, SelectField, Skeleton, StatusPill, TextField } from "../../components/ui/primitives";
import { useToast } from "../../components/ui/toast";
import { ApiRequestError, createApiClient } from "../../services/api";
import { useSession } from "../auth/session-context";

const limit = 25;

type Filters = {
  q: string;
  status: string;
  categoryId: string;
  countryCode: string;
  locality: string;
  includeArchived: boolean;
  sort: "created_at" | "updated_at" | "name";
  direction: "asc" | "desc";
};

const initialFilters: Filters = {
  q: "",
  status: "",
  categoryId: "",
  countryCode: "",
  locality: "",
  includeArchived: false,
  sort: "created_at",
  direction: "desc",
};

export function PlacesPage() {
  const { session } = useSession();
  const toast = useToast();
  const client = createApiClient(() => session?.accessToken ?? null);
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const debouncedQ = useDebounced(q, 250);

  useEffect(() => {
    setFilters((current) => ({ ...current, q: debouncedQ }));
    setPage(1);
  }, [debouncedQ]);

  const categories = useQuery({
    queryKey: ["admin", "place-categories", session?.userId],
    enabled: Boolean(session),
    queryFn: () => client.request<{ categories: PlaceCategoryOption[] }>("/api/v1/admin/place-categories"),
  });
  const countries = useQuery({
    queryKey: ["admin", "place-countries", session?.userId],
    enabled: Boolean(session),
    queryFn: () => client.request<{ countries: { code: string; currency: string }[] }>("/api/v1/admin/place-countries"),
  });
  const places = useQuery({
    queryKey: ["admin", "places", session?.userId, filters, page],
    enabled: Boolean(session),
    queryFn: () => client.request<PlaceListResponse>(`/api/v1/admin/places?${queryString(filters, page)}`),
  });

  const pageCount = Math.max(1, Math.ceil((places.data?.total ?? 0) / limit));
  const categoryOptions = (categories.data?.categories ?? []).filter((item) => item.parentId === null);

  async function transition(id: string, action: "archive" | "restore") {
    setPendingId(id);
    try {
      await client.request(`/api/v1/admin/places/${id}/${action}`, { method: "POST" });
      toast(action === "archive" ? "Place archived." : "Place restored as a draft.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "places"] });
    } catch (error) {
      toast(error instanceof ApiRequestError ? error.message : "The place could not be updated.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="stack">
      <div className="toolbar">
        <header>
          <h1 className="page-title">Places</h1>
          <p className="page-intro muted">Catalog records operators can publish, correct, and archive.</p>
        </header>
        <Link className="btn" to="/admin/places/new">New place</Link>
      </div>
      <div className="filter-bar">
        <TextField label="Search" value={q} onChange={setQ} />
        <SelectField
          label="Status"
          value={filters.status}
          onChange={(status) => changeFilter(setFilters, setPage, { status })}
          options={[
            { value: "", label: "Any live status" },
            { value: "draft", label: "Draft" },
            { value: "active", label: "Active" },
            { value: "unavailable", label: "Unavailable" },
            { value: "deleted", label: "Archived" },
          ]}
        />
        <SelectField
          label="Category"
          value={filters.categoryId}
          onChange={(categoryId) => changeFilter(setFilters, setPage, { categoryId })}
          options={[{ value: "", label: "Any category" }, ...categoryOptions.map((item) => ({ value: item.id, label: item.name }))]}
        />
        <SelectField
          label="Country"
          value={filters.countryCode}
          onChange={(countryCode) => changeFilter(setFilters, setPage, { countryCode })}
          options={[{ value: "", label: "Any country" }, ...(countries.data?.countries ?? []).map((item) => ({ value: item.code, label: item.code }))]}
        />
        <TextField label="City" value={filters.locality} onChange={(locality) => changeFilter(setFilters, setPage, { locality })} />
        <SelectField
          label="Sort"
          value={`${filters.sort}:${filters.direction}`}
          onChange={(value) => {
            const [sort, direction] = value.split(":") as [Filters["sort"], Filters["direction"]];
            changeFilter(setFilters, setPage, { sort, direction });
          }}
          options={[
            { value: "created_at:desc", label: "Newest" },
            { value: "updated_at:desc", label: "Recently updated" },
            { value: "name:asc", label: "Name" },
          ]}
        />
        <label className="check-field">
          <input
            type="checkbox"
            checked={filters.includeArchived}
            onChange={(event) => changeFilter(setFilters, setPage, { includeArchived: event.target.checked })}
          />
          Include archived
        </label>
      </div>
      {places.isLoading ? <PlacesSkeleton /> : null}
      {places.isError ? (
        <ErrorState
          title="Places could not be loaded"
          body={places.error instanceof ApiRequestError ? places.error.message : "Try again."}
          onRetry={() => void places.refetch()}
        />
      ) : null}
      {places.data && places.data.total === 0 ? (
        <EmptyState title="No places" body="Nothing matches these filters. Create a place or clear the search." />
      ) : null}
      {places.data && places.data.items.length > 0 ? (
        <>
          <table className="data-table places-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Location</th>
                <th>Status</th>
                <th>Updated</th>
                <th><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {places.data.items.map((place) => (
                <tr key={place.id}>
                  <td data-label="Name"><Link to={`/admin/places/${place.id}`}>{place.name}</Link></td>
                  <td data-label="Category">{place.category ?? "—"}</td>
                  <td data-label="Location">{[place.locality, place.countryCode].filter(Boolean).join(", ")}</td>
                  <td data-label="Status"><StatusPill tone={toneFor(place.status)}>{labelFor(place.status)}</StatusPill></td>
                  <td data-label="Updated">{new Date(place.updatedAt).toLocaleString()}</td>
                  <td data-label="Actions">
                    {place.status === "deleted" ? (
                      <Button variant="secondary" disabled={pendingId === place.id} onClick={() => void transition(place.id, "restore")}>Restore</Button>
                    ) : (
                      <ArchiveButton disabled={pendingId === place.id} onConfirm={() => void transition(place.id, "archive")} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageCount={pageCount} onPage={setPage} />
          <p className="meta">{places.data.total.toLocaleString()} places</p>
        </>
      ) : null}
    </div>
  );
}

function ArchiveButton({ disabled, onConfirm }: { disabled: boolean; onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" disabled={disabled} onClick={() => setOpen(true)}>Archive</Button>
      <Dialog open={open} title="Archive this place?" onClose={() => setOpen(false)}>
        <p>It leaves public discovery and stays available here for restore.</p>
        <div className="form-actions">
          <Button onClick={() => { setOpen(false); onConfirm(); }}>Archive</Button>
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </Dialog>
    </>
  );
}

function PlacesSkeleton() {
  return (
    <div className="stack" aria-hidden="true">
      <Skeleton height={28} />
      <Skeleton height={28} />
      <Skeleton height={28} />
    </div>
  );
}

function changeFilter(setFilters: (value: Filters | ((current: Filters) => Filters)) => void, setPage: (page: number) => void, patch: Partial<Filters>) {
  setFilters((current) => ({ ...current, ...patch }));
  setPage(1);
}

function queryString(filters: Filters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.countryCode) params.set("countryCode", filters.countryCode);
  if (filters.locality) params.set("locality", filters.locality);
  if (filters.includeArchived) params.set("includeArchived", "true");
  params.set("sort", filters.sort);
  params.set("direction", filters.direction);
  params.set("limit", String(limit));
  params.set("offset", String((page - 1) * limit));
  return params.toString();
}

function toneFor(status: string): "ok" | "warn" | "neutral" | "danger" {
  if (status === "active") return "ok";
  if (status === "unavailable") return "warn";
  if (status === "deleted") return "danger";
  return "neutral";
}

function labelFor(status: string): string {
  if (status === "deleted") return "Archived";
  return status.slice(0, 1).toUpperCase() + status.slice(1);
}

function useDebounced(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
