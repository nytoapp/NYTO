import { Injectable } from "@nestjs/common";
import type { AdminOverview } from "@atlas/contracts";
import { ErrorCodes } from "@atlas/contracts";
import { Database } from "../../shared/db/database";
import { AppError } from "../../shared/http/app-error";
import {
  assembleOverview,
  type OverviewActivity,
  type OverviewCategory,
  type OverviewCounts,
  type OverviewProvider,
  type OverviewSubject,
} from "./overview.assemble";

@Injectable()
export class AdminOverviewService {
  constructor(private readonly database: Database) {}

  async load(): Promise<AdminOverview> {
    try {
      const [counts, categories, recentSubjects, providers, activity] = await Promise.all([
        this.counts(),
        this.categories(),
        this.recentSubjects(),
        this.providers(),
        this.activity(),
      ]);
      return assembleOverview({ counts, categories, recentSubjects, providers, activity }, new Date());
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ErrorCodes.SERVICE_UNAVAILABLE, "Operational data is unavailable. Try again.", 503, true);
    }
  }

  private async counts(): Promise<OverviewCounts> {
    const result = await this.database.pool.query(
      `select
         (select count(*) from catalog_subjects where kind = 'place' and deleted_at is null and status = 'active')::int as places,
         (select count(*) from catalog_subjects where kind = 'event' and deleted_at is null and status = 'active')::int as events,
         (select count(*) from providers where status = 'active')::int as providers,
         (select count(*) from users where status = 'active' and deleted_at is null)::int as users,
         (select count(*) from saved_items)::int as saves,
         (select count(*) from trips where deleted_at is null)::int as trips`,
    );
    const row = result.rows[0] as OverviewCounts | undefined;
    if (!row) {
      throw new AppError(ErrorCodes.SERVICE_UNAVAILABLE, "Operational data is unavailable. Try again.", 503, true);
    }
    return {
      places: Number(row.places),
      events: Number(row.events),
      providers: Number(row.providers),
      users: Number(row.users),
      saves: Number(row.saves),
      trips: Number(row.trips),
    };
  }

  private async categories(): Promise<OverviewCategory[]> {
    const result = await this.database.pool.query(
      `select c.slug, coalesce(ct.name, c.slug) as label, count(sc.subject_id)::int as subject_count
       from categories c
       left join category_translations ct on ct.category_id = c.id and ct.locale = 'en'
       left join subject_categories sc on sc.category_id = c.id
       where c.deleted_at is null and c.status = 'active'
       group by c.id, c.slug, ct.name, c.sort_order
       order by count(sc.subject_id) desc, c.sort_order
       limit 8`,
    );
    return result.rows.map((row: { slug: string; label: string; subject_count: number }) => ({
      slug: String(row.slug),
      label: String(row.label),
      subjectCount: Number(row.subject_count),
    }));
  }

  private async recentSubjects(): Promise<OverviewSubject[]> {
    const result = await this.database.pool.query(
      `select s.id, s.kind, s.created_at, coalesce(t.name, 'Untitled') as title
       from catalog_subjects s
       left join subject_translations t on t.subject_id = s.id and t.locale = 'en'
       where s.deleted_at is null and s.status = 'active'
       order by s.created_at desc
       limit 8`,
    );
    return result.rows.map((row: { id: string; kind: string; title: string; created_at: Date }) => ({
      id: String(row.id),
      kind: String(row.kind),
      title: String(row.title),
      createdAt: new Date(row.created_at).toISOString(),
    }));
  }

  private async providers(): Promise<OverviewProvider[]> {
    const result = await this.database.pool.query(
      `select code, display_name, status from providers order by display_name asc limit 50`,
    );
    return result.rows.map((row: { code: string; display_name: string; status: string }) => ({
      code: String(row.code),
      name: String(row.display_name),
      status: row.status === "disabled" ? "disabled" : "active",
    }));
  }

  private async activity(): Promise<OverviewActivity[]> {
    const result = await this.database.pool.query(
      `select id, occurred_at, action, target_type
       from audit_events
       order by occurred_at desc
       limit 12`,
    );
    return result.rows.map((row: { id: string; occurred_at: Date; action: string; target_type: string }) => ({
      id: String(row.id),
      occurredAt: new Date(row.occurred_at).toISOString(),
      action: String(row.action),
      targetType: String(row.target_type),
    }));
  }
}
