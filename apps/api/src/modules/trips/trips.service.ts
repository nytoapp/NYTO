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
      const existing = await client.query(
        `select t.id
         from trips t
         where t.owner_user_id = $1
           and t.destination_location_id = $2
           and t.starts_on = $3::date
           and t.ends_on = $4::date
           and t.deleted_at is null
         order by t.created_at desc
         limit 1`,
        [userId, place.id, input.startsOn, input.endsOn],
      );
      const existingId = existing.rows[0]?.id ? String(existing.rows[0].id) : null;
      if (existingId) {
        if (input.title) {
          await client.query("update trips set title = $2 where id = $1 and title is null", [existingId, input.title]);
        }
        await client.query("commit");
        const days = await this.pool.query("select count(*)::int as days from trip_days where trip_id = $1", [existingId]);
        return { id: existingId, timezone: place.timezone, destinationLabel: place.label, days: Number(days.rows[0]?.days ?? 0) };
      }
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
      `with counted as (
         select t.id, t.title, t.starts_on, t.ends_on, t.timezone, t.created_at, l.label as destination_label,
                (select count(*)::int from trip_items i where i.trip_id = t.id) as item_count,
                (timezone(t.timezone, clock_timestamp()))::date as local_today
         from trips t
         join resolved_locations l on l.id = t.destination_location_id
         where t.owner_user_id = $1 and t.deleted_at is null
       )
       select id, title, to_char(starts_on, 'YYYY-MM-DD') as starts_on, to_char(ends_on, 'YYYY-MM-DD') as ends_on,
              timezone, destination_label, item_count,
              case
                when ends_on < local_today then 'past'
                when starts_on > local_today then 'upcoming'
                else 'current'
              end as status
       from counted c
       where c.item_count > 0
          or c.id = (
            select c2.id
            from counted c2
            where c2.destination_label = c.destination_label
              and c2.starts_on = c.starts_on
              and c2.ends_on = c.ends_on
              and c2.item_count = 0
              and not exists (
                select 1 from counted c3
                where c3.destination_label = c.destination_label
                  and c3.starts_on = c.starts_on
                  and c3.ends_on = c.ends_on
                  and c3.item_count > 0
              )
            order by c2.created_at desc
            limit 1
          )
       order by case when ends_on < local_today then 2 when starts_on > local_today then 1 else 0 end, starts_on desc`,
      [userId],
    );
    const tripIds = result.rows.map((row) => String(row.id));
    const stops = new Map<string, { title: string; slot: string }[]>();
    if (tripIds.length > 0) {
      const items = await this.pool.query(
        `select i.trip_id::text as trip_id, i.slot, coalesce(tr.name, 'Untitled') as title
         from trip_items i
         join catalog_subjects s on s.id = i.subject_id and s.deleted_at is null
         left join subject_translations tr on tr.subject_id = s.id and tr.locale = 'en'
         where i.trip_id = any($1::uuid[])
         order by case i.slot
           when 'morning' then 1
           when 'lunch' then 2
           when 'afternoon' then 3
           when 'dinner' then 4
           when 'night' then 5
           else 6
         end, i.position`,
        [tripIds],
      );
      for (const item of items.rows) {
        const tripId = String(item.trip_id);
        const list = stops.get(tripId) ?? [];
        list.push({ title: String(item.title), slot: String(item.slot) });
        stops.set(tripId, list);
      }
    }
    return result.rows.map((row) => ({
      id: String(row.id),
      title: row.title ? String(row.title) : String(row.destination_label),
      startsOn: String(row.starts_on).slice(0, 10),
      endsOn: String(row.ends_on).slice(0, 10),
      timezone: String(row.timezone),
      destinationLabel: String(row.destination_label),
      itemCount: Number(row.item_count ?? 0),
      status: row.status === "past" || row.status === "upcoming" ? row.status : "current",
      stops: stops.get(String(row.id)) ?? [],
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
