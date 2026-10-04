import { DateTime } from "luxon";
import { ErrorCodes, tripDetailSchema, type CatalogKind } from "@atlas/contracts";
import type { Pool } from "pg";
import { AppError } from "../../shared/http/app-error";

export class TripsService {
  constructor(private readonly pool: Pool) {}

  async create(userId: string, input: { destinationLocationId: string; startsOn: string; endsOn: string; title?: string | null; partySize?: number | null }) {
    if (input.endsOn < input.startsOn) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, "The trip end date is before the start date.", 422);
    }
    const location = await this.pool.query("select id, timezone, label from resolved_locations where id = $1", [input.destinationLocationId]);
    const place = location.rows[0] as { id: string; timezone: string; label: string } | undefined;
    if (!place) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Choose a destination from the list.", 404);
    }
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const trip = await client.query(
        `insert into trips (owner_user_id, destination_location_id, title, starts_on, ends_on, timezone, party_size, status)
         values ($1, $2, $3, $4, $5, $6, $7, 'draft') returning id`,
        [userId, place.id, input.title ?? null, input.startsOn, input.endsOn, place.timezone, input.partySize ?? null],
      );
      const tripId = String(trip.rows[0].id);
      let cursor = DateTime.fromISO(input.startsOn, { zone: place.timezone }).startOf("day");
      const end = DateTime.fromISO(input.endsOn, { zone: place.timezone }).startOf("day");
      let position = 0;
      while (cursor <= end) {
        await client.query("insert into trip_days (trip_id, civil_date, position) values ($1, $2, $3)", [
          tripId,
          cursor.toISODate(),
          position,
        ]);
        cursor = cursor.plus({ days: 1 });
        position += 1;
      }
      await client.query("commit");
      return { id: tripId, timezone: place.timezone, destinationLabel: place.label, days: position };
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async list(userId: string) {
    const result = await this.pool.query(
      `select t.id, t.title, to_char(t.starts_on, 'YYYY-MM-DD') as starts_on, to_char(t.ends_on, 'YYYY-MM-DD') as ends_on, t.timezone, l.label
       from trips t join resolved_locations l on l.id = t.destination_location_id
       where t.owner_user_id = $1 and t.deleted_at is null
       order by t.starts_on`,
      [userId],
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      title: row.title ? String(row.title) : String(row.label),
      startsOn: String(row.starts_on).slice(0, 10),
      endsOn: String(row.ends_on).slice(0, 10),
      timezone: String(row.timezone),
      destinationLabel: String(row.label),
    }));
  }

  async get(userId: string, tripId: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tripId)) {
      throw new AppError(ErrorCodes.NOT_FOUND, "That trip is not available.", 404);
    }
    const trip = await this.pool.query(
      `select t.id, t.title, to_char(t.starts_on, 'YYYY-MM-DD') as starts_on, to_char(t.ends_on, 'YYYY-MM-DD') as ends_on, t.timezone, l.label
       from trips t join resolved_locations l on l.id = t.destination_location_id
       where t.id = $1 and t.owner_user_id = $2 and t.deleted_at is null`,
      [tripId, userId],
    );
    const row = trip.rows[0];
    if (!row) {
      throw new AppError(ErrorCodes.NOT_FOUND, "That trip is not available.", 404);
    }
    const dayRows = await this.pool.query(
      `select id, to_char(civil_date, 'YYYY-MM-DD') as civil_date
       from trip_days where trip_id = $1 order by position`,
      [tripId],
    );
    const items = await this.pool.query(
      `select i.id, i.trip_day_id, i.subject_id, i.slot, to_char(i.local_time, 'HH24:MI') as local_time, i.notes,
              coalesce(tr.name, 'Untitled') as title, s.kind
       from trip_items i
       join catalog_subjects s on s.id = i.subject_id and s.deleted_at is null
       left join subject_translations tr on tr.subject_id = s.id and tr.locale = 'en'
       where i.trip_id = $1
       order by i.local_time nulls last, i.position`,
      [tripId],
    );
    type DayItem = { id: string; subjectId: string; title: string; kind: CatalogKind; slot: "morning" | "lunch" | "afternoon" | "dinner" | "night" | "unscheduled"; localTime: string | null; notes: string | null };
    const days = new Map<string, { id: string; date: string; items: DayItem[] }>();
    for (const day of dayRows.rows) {
      days.set(String(day.id), { id: String(day.id), date: String(day.civil_date), items: [] });
    }
    const firstDay = days.values().next().value as { id: string; date: string; items: DayItem[] } | undefined;
    for (const item of items.rows) {
      const day = (item.trip_day_id ? days.get(String(item.trip_day_id)) : undefined) ?? firstDay;
      if (!day) continue;
      day.items.push({
        id: String(item.id),
        subjectId: String(item.subject_id),
        title: String(item.title),
        kind: item.kind as CatalogKind,
        slot: item.slot,
        localTime: item.local_time ? String(item.local_time) : null,
        notes: item.notes ? String(item.notes) : null,
      });
    }
    return tripDetailSchema.parse({
      id: String(row.id),
      title: row.title ? String(row.title) : String(row.label),
      startsOn: String(row.starts_on).slice(0, 10),
      endsOn: String(row.ends_on).slice(0, 10),
      timezone: String(row.timezone),
      destinationLabel: String(row.label),
      days: [...days.values()],
    });
  }

  async addItem(
    userId: string,
    tripId: string,
    input: { subjectId: string; occurrenceId?: string | null; slot: string; tripDayId?: string | null; localTime?: string | null; notes?: string | null },
  ) {
    const trip = await this.pool.query("select timezone from trips where id = $1 and owner_user_id = $2 and deleted_at is null", [tripId, userId]);
    if (!trip.rowCount) {
      throw new AppError(ErrorCodes.NOT_FOUND, "That trip is not available.", 404);
    }
    const subject = await this.pool.query("select 1 from catalog_subjects where id = $1 and deleted_at is null", [input.subjectId]);
    if (!subject.rowCount) {
      throw new AppError(ErrorCodes.NOT_FOUND, "That item is no longer available.", 404);
    }
    const place = await this.pool.query("select timezone from places where subject_id = $1", [input.subjectId]);
    const inserted = await this.pool.query(
      `insert into trip_items (trip_id, trip_day_id, subject_id, occurrence_id, slot, local_time, venue_timezone, notes, position)
       values ($1, $2, $3, $4, $5, $6, $7, $8, (select coalesce(max(position), 0) + 1 from trip_items where trip_id = $1))
       returning id`,
      [
        tripId,
        input.tripDayId ?? null,
        input.subjectId,
        input.occurrenceId ?? null,
        input.slot,
        input.localTime ?? null,
        place.rows[0]?.timezone ?? trip.rows[0].timezone,
        input.notes ?? null,
      ],
    );
    return { id: String(inserted.rows[0].id) };
  }
}
