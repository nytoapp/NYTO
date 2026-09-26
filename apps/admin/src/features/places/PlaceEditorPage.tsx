import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { PlaceCategoryOption, PlaceDetail } from "@atlas/contracts";
import { Button, ErrorState, SelectField, Skeleton, StatusPill, TextField } from "../../components/ui/primitives";
import { useToast } from "../../components/ui/toast";
import { ApiRequestError, createApiClient } from "../../services/api";
import { useSession } from "../auth/session-context";
import { compilePlaceDraft, draftFromDetail, emptyDraft, weekdays, type PlaceDraft } from "./form";

const timeZones = "supportedValuesOf" in Intl ? Intl.supportedValuesOf("timeZone") : [];

export function PlaceEditorPage({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const client = createApiClient(() => session?.accessToken ?? null);
  const [draft, setDraft] = useState<PlaceDraft | null>(mode === "create" ? emptyDraft() : null);
  const [baseline, setBaseline] = useState(() => JSON.stringify(emptyDraft()));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const place = useQuery({
    queryKey: ["admin", "place", id],
    enabled: mode === "edit" && Boolean(id && session),
    queryFn: () => client.request<PlaceDetail>(`/api/v1/admin/places/${id}`),
  });
  const categories = useQuery({
    queryKey: ["admin", "place-categories"],
    enabled: Boolean(session),
    queryFn: () => client.request<{ categories: PlaceCategoryOption[] }>("/api/v1/admin/place-categories"),
  });
  const countries = useQuery({
    queryKey: ["admin", "place-countries"],
    enabled: Boolean(session),
    queryFn: () => client.request<{ countries: { code: string; currency: string }[]; currencies: string[] }>("/api/v1/admin/place-countries"),
  });
  const tags = useQuery({
    queryKey: ["admin", "place-tags"],
    enabled: Boolean(session),
    queryFn: () => client.request<{ tags: { id: string; name: string }[] }>("/api/v1/admin/place-tags"),
  });
  const providers = useQuery({
    queryKey: ["admin", "place-providers"],
    enabled: Boolean(session),
    queryFn: () => client.request<{ providers: { code: string; name: string }[] }>("/api/v1/admin/place-providers"),
  });

  useEffect(() => {
    if (!place.data) return;
    const next = draftFromDetail(place.data);
    setDraft(next);
    setBaseline(JSON.stringify(next));
  }, [place.data]);

  const dirty = draft !== null && JSON.stringify(draft) !== baseline;
  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const save = useMutation({
    mutationFn: async (body: ReturnType<typeof compilePlaceDraft> & { ok: true }) => {
      if (mode === "create") {
        return client.request<PlaceDetail>("/api/v1/admin/places", { method: "POST", body: JSON.stringify(body.value) });
      }
      return client.request<PlaceDetail>(`/api/v1/admin/places/${id}`, { method: "PATCH", body: JSON.stringify(body.value) });
    },
    onSuccess: async (saved) => {
      toast(mode === "create" ? "Place created." : "Place saved.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "places"] });
      const next = draftFromDetail(saved);
      setDraft(next);
      setBaseline(JSON.stringify(next));
      setErrors({});
      if (mode === "create") {
        navigate(`/admin/places/${saved.id}`, { replace: true });
      }
    },
    onError: (error) => {
      setErrors(apiFieldErrors(error));
      toast(error instanceof ApiRequestError ? error.message : "The place could not be saved.");
    },
  });

  const parents = (categories.data?.categories ?? []).filter((item) => item.parentId === null);
  const children = (categories.data?.categories ?? []).filter((item) => item.parentId === draft?.categoryId);
  const currencyOptions = countries.data?.currencies ?? [];

  function update(patch: Partial<PlaceDraft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function submit() {
    if (!draft) return;
    const compiled = compilePlaceDraft(draft);
    if (!compiled.ok) {
      setErrors(compiled.errors);
      return;
    }
    setErrors({});
    save.mutate(compiled);
  }

  async function transition(action: "archive" | "restore") {
    if (!id) return;
    if (dirty && !window.confirm("This discards unsaved edits. Continue?")) return;
    try {
      const saved = await client.request<PlaceDetail>(`/api/v1/admin/places/${id}/${action}`, { method: "POST" });
      const next = draftFromDetail(saved);
      setDraft(next);
      setBaseline(JSON.stringify(next));
      toast(action === "archive" ? "Place archived." : "Place restored as a draft.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "places"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "place", id] });
    } catch (error) {
      toast(error instanceof ApiRequestError ? error.message : "The place could not be updated.");
    }
  }

  function cancel() {
    if (dirty && !window.confirm("Leave without saving changes?")) return;
    navigate("/admin/places");
  }

  if (mode === "edit" && place.isLoading) {
    return <div className="editor"><Skeleton height={28} /><Skeleton height={180} /></div>;
  }
  if (mode === "edit" && place.isError) {
    return (
      <ErrorState
        title="This place could not be opened"
        body={place.error instanceof ApiRequestError ? place.error.message : "Try again."}
        onRetry={() => void place.refetch()}
      />
    );
  }
  if (!draft) return null;

  return (
    <form
      className="editor"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <header className="toolbar">
        <div>
          <p className="meta"><Link to="/admin/places">Places</Link></p>
          <h1 className="page-title">{mode === "create" ? "New place" : draft.name || "Place"}</h1>
        </div>
        {place.data?.archived ? <StatusPill tone="danger">Archived</StatusPill> : null}
      </header>

      <fieldset className="form-section">
        <legend>Overview</legend>
        <p className="note">Catalog places do not store a rating. A provider rating stays with that provider.</p>
        <TextField label="Name" required value={draft.name} error={errors.name} onChange={(name) => update({ name })} />
        <label className="field">
          Summary
          <textarea className="text-field" rows={4} value={draft.summary} onChange={(event) => update({ summary: event.target.value })} />
          {errors.summary ? <span className="field-error">{errors.summary}</span> : null}
        </label>
        <div className="form-grid">
          <SelectField
            label="Status"
            value={draft.status}
            error={errors.status}
            onChange={(status) => update({ status: status as PlaceDraft["status"] })}
            options={[
              { value: "draft", label: "Draft" },
              { value: "active", label: "Active" },
              { value: "unavailable", label: "Unavailable" },
            ]}
          />
          <TextField label="Locale" value={draft.locale} error={errors.locale} onChange={(locale) => update({ locale })} />
        </div>
        {place.data?.archived ? <p className="note">Saving keeps this place archived. Restore it before it can be published again.</p> : null}
      </fieldset>

      <fieldset className="form-section">
        <legend>Categories</legend>
        <div className="form-grid">
          <SelectField
            label="Category"
            required
            value={draft.categoryId}
            error={errors.categoryId}
            onChange={(categoryId) => update({ categoryId, subcategoryId: "" })}
            options={[{ value: "", label: "Choose" }, ...parents.map((item) => ({ value: item.id, label: item.name }))]}
          />
          <SelectField
            label="Subcategory"
            value={draft.subcategoryId}
            error={errors.subcategoryId}
            onChange={(subcategoryId) => update({ subcategoryId })}
            options={[{ value: "", label: "None" }, ...children.map((item) => ({ value: item.id, label: item.name }))]}
          />
        </div>
        <div className="tag-list">
          {(tags.data?.tags ?? []).map((tag) => {
            const checked = draft.tagIds.includes(tag.id);
            return (
              <label key={tag.id}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && draft.tagIds.length >= 12}
                  onChange={() => update({ tagIds: checked ? draft.tagIds.filter((item) => item !== tag.id) : [...draft.tagIds, tag.id] })}
                />
                {tag.name}
              </label>
            );
          })}
        </div>
        {errors.tagIds ? <span className="field-error">{errors.tagIds}</span> : null}
      </fieldset>

      <fieldset className="form-section">
        <legend>Location</legend>
        <div className="form-grid">
          <SelectField
            label="Country"
            required
            value={draft.countryCode}
            error={errors.countryCode}
            onChange={(countryCode) => {
              const match = countries.data?.countries.find((item) => item.code === countryCode);
              update({ countryCode, priceCurrency: draft.priceCurrency || match?.currency || "" });
            }}
            options={[{ value: "", label: "Choose" }, ...(countries.data?.countries ?? []).map((item) => ({ value: item.code, label: item.code }))]}
          />
          <TextField label="Timezone" required list="timezones" value={draft.timezone} error={errors.timezone} onChange={(timezone) => update({ timezone })} />
          <datalist id="timezones">{timeZones.map((zone) => <option key={zone} value={zone} />)}</datalist>
          <TextField label="Latitude" required inputMode="decimal" value={draft.latitude} error={errors.latitude} onChange={(latitude) => update({ latitude })} />
          <TextField label="Longitude" required inputMode="decimal" value={draft.longitude} error={errors.longitude} onChange={(longitude) => update({ longitude })} />
          <TextField label="Street" value={draft.streetLine} error={errors.streetLine} onChange={(streetLine) => update({ streetLine })} />
          <TextField label="City" value={draft.locality} error={errors.locality} onChange={(locality) => update({ locality })} />
          <TextField label="Region" value={draft.adminArea} error={errors.adminArea} onChange={(adminArea) => update({ adminArea })} />
          <TextField label="Postal code" value={draft.postalCode} error={errors.postalCode} onChange={(postalCode) => update({ postalCode })} />
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>Contact</legend>
        <div className="form-grid">
          <TextField label="Phone" inputMode="tel" value={draft.phoneE164} error={errors.phoneE164} onChange={(phoneE164) => update({ phoneE164 })} />
          <TextField label="Website" inputMode="url" value={draft.websiteUrl} error={errors.websiteUrl} onChange={(websiteUrl) => update({ websiteUrl })} />
        </div>
        <p className="note">The website is stored as a destination. Public clients resolve it through the destination handle, not by opening this URL themselves.</p>
        {place.data?.websiteDestinationId ? <p className="meta">Destination {place.data.websiteDestinationId}</p> : null}
      </fieldset>

      <fieldset className="form-section">
        <legend>Price</legend>
        <div className="form-grid">
          <TextField label="Amount" inputMode="decimal" value={draft.priceAmount} error={errors.price} onChange={(priceAmount) => update({ priceAmount })} />
          <SelectField
            label="Currency"
            value={draft.priceCurrency}
            onChange={(priceCurrency) => update({ priceCurrency })}
            options={[{ value: "", label: "None" }, ...currencyOptions.map((code) => ({ value: code, label: code }))]}
          />
          <SelectField
            label="Basis"
            value={draft.priceBasis}
            onChange={(priceBasis) => update({ priceBasis: priceBasis as PlaceDraft["priceBasis"] })}
            options={[
              { value: "", label: "None" },
              { value: "per_person", label: "Per person" },
              { value: "per_night", label: "Per night" },
              { value: "total", label: "Total" },
            ]}
          />
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>Hours</legend>
        {errors.hours ? <span className="field-error">{errors.hours}</span> : null}
        {draft.hours.map((hour, index) => (
          <div className="repeat-row" key={`${index}-${hour.weekday}`}>
            <SelectField
              label="Day"
              value={hour.weekday}
              onChange={(weekday) => update({ hours: replace(draft.hours, index, { ...hour, weekday }) })}
              options={weekdays.map((label, weekday) => ({ value: String(weekday), label }))}
            />
            <TextField label="Opens" value={hour.opensLocal} onChange={(opensLocal) => update({ hours: replace(draft.hours, index, { ...hour, opensLocal }) })} />
            <TextField label="Closes" value={hour.closesLocal} onChange={(closesLocal) => update({ hours: replace(draft.hours, index, { ...hour, closesLocal }) })} />
            <label className="check-field">
              <input
                type="checkbox"
                checked={hour.spansNextDay}
                onChange={(event) => update({ hours: replace(draft.hours, index, { ...hour, spansNextDay: event.target.checked }) })}
              />
              Next day
            </label>
            <Button variant="secondary" onClick={() => update({ hours: draft.hours.filter((_, item) => item !== index) })}>Remove</Button>
          </div>
        ))}
        {draft.hours.length < 21 ? (
          <Button variant="secondary" onClick={() => update({ hours: [...draft.hours, { weekday: "1", opensLocal: "09:00", closesLocal: "17:00", spansNextDay: false }] })}>Add hours</Button>
        ) : null}
      </fieldset>

      <fieldset className="form-section">
        <legend>Media</legend>
        {errors.media ? <span className="field-error">{errors.media}</span> : null}
        {draft.media.map((item, index) => (
          <div className="form-grid" key={`media-${index}`}>
            <TextField label="Image URL" value={item.url} onChange={(url) => update({ media: replace(draft.media, index, { ...item, url }) })} />
            <TextField label="Alt text" value={item.alt} onChange={(alt) => update({ media: replace(draft.media, index, { ...item, alt }) })} />
            <Button variant="secondary" onClick={() => update({ media: draft.media.filter((_, itemIndex) => itemIndex !== index) })}>Remove</Button>
          </div>
        ))}
        {draft.media.length < 8 ? (
          <Button variant="secondary" onClick={() => update({ media: [...draft.media, { url: "", alt: "" }] })}>Add image</Button>
        ) : null}
      </fieldset>

      <fieldset className="form-section">
        <legend>Providers</legend>
        {place.data && place.data.providerReferences.length > 0 ? (
          <ul className="note">
            {place.data.providerReferences.map((reference) => (
              <li key={`${reference.providerCode}:${reference.externalId}`}>
                {reference.providerName} · {reference.externalId}
              </li>
            ))}
          </ul>
        ) : <p className="note">No provider identity is linked yet.</p>}
        <div className="form-grid">
          <SelectField
            label="Add provider"
            value={draft.providerCode}
            error={errors.providerReference}
            onChange={(providerCode) => update({ providerCode })}
            options={[{ value: "", label: "None" }, ...(providers.data?.providers ?? []).map((item) => ({ value: item.code, label: item.name }))]}
          />
          <TextField label="External id" value={draft.externalId} onChange={(externalId) => update({ externalId })} />
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>Metadata</legend>
        {errors.attributes ? <span className="field-error">{errors.attributes}</span> : null}
        {draft.attributes.map((item, index) => (
          <div className="form-grid" key={`attr-${index}`}>
            <TextField label="Key" value={item.key} onChange={(key) => update({ attributes: replace(draft.attributes, index, { ...item, key }) })} />
            <TextField label="Value" value={item.value} onChange={(value) => update({ attributes: replace(draft.attributes, index, { ...item, value }) })} />
          </div>
        ))}
        {draft.attributes.length < 20 ? (
          <Button variant="secondary" onClick={() => update({ attributes: [...draft.attributes, { key: "", value: "" }] })}>Add attribute</Button>
        ) : null}
      </fieldset>

      {place.data ? (
        <fieldset className="form-section">
          <legend>Audit</legend>
          <p className="meta">Created {new Date(place.data.createdAt).toLocaleString()}</p>
          <p className="meta">Updated {new Date(place.data.updatedAt).toLocaleString()}</p>
          {place.data.audit.length === 0 ? <p className="note">No recorded changes yet.</p> : (
            <ul className="note">
              {place.data.audit.map((event) => (
                <li key={`${event.action}:${event.occurredAt}`}>{event.action} · {new Date(event.occurredAt).toLocaleString()}</li>
              ))}
            </ul>
          )}
        </fieldset>
      ) : null}

      <div className="form-actions">
        <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving" : "Save"}</Button>
        <Button variant="secondary" onClick={cancel}>Cancel</Button>
        {mode === "edit" && place.data && !place.data.archived ? (
          <Button variant="secondary" onClick={() => void transition("archive")}>Archive</Button>
        ) : null}
        {mode === "edit" && place.data?.archived ? (
          <Button variant="secondary" onClick={() => void transition("restore")}>Restore</Button>
        ) : null}
      </div>
    </form>
  );
}

function replace<T>(items: T[], index: number, next: T): T[] {
  return items.map((item, itemIndex) => (itemIndex === index ? next : item));
}

function apiFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiRequestError) || !error.details || typeof error.details !== "object" || !("fields" in error.details)) {
    return {};
  }
  const fields = (error.details as { fields?: unknown }).fields;
  if (!Array.isArray(fields)) return {};
  return Object.fromEntries(fields.filter((field): field is string => typeof field === "string" && field.length > 0).map((field) => [field, error.message]));
}
