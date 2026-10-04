import { limits } from "@atlas/config";
import { ErrorCodes } from "@atlas/contracts";
import type { Pool } from "pg";
import { AppError } from "../../shared/http/app-error";

export class LibraryService {
  constructor(private readonly pool: Pool) {}

  async save(userId: string, subjectId: string, occurrenceId: string | null): Promise<{ id: string }> {
    await this.assertLiveSubject(subjectId);
    try {
      const inserted = await this.pool.query(
        `insert into saved_items (user_id, subject_id, occurrence_id) values ($1, $2, $3) returning id`,
        [userId, subjectId, occurrenceId],
      );
      return { id: String(inserted.rows[0].id) };
    } catch (error) {
      if (isUnique(error)) {
        const existing = await this.pool.query(
          `select id from saved_items where user_id = $1 and subject_id = $2 and occurrence_id is not distinct from $3`,
          [userId, subjectId, occurrenceId],
        );
        return { id: String(existing.rows[0].id) };
      }
      throw error;
    }
  }

  async remove(userId: string, subjectId: string): Promise<void> {
    await this.pool.query(`delete from saved_items where user_id = $1 and subject_id = $2`, [userId, subjectId]);
  }

  async listSaves(userId: string): Promise<{ id: string; subjectId: string }[]> {
    const result = await this.pool.query(
      `select s.id, s.subject_id from saved_items s
       join catalog_subjects c on c.id = s.subject_id and c.deleted_at is null
       where s.user_id = $1 order by s.created_at desc limit 50`,
      [userId],
    );
    return result.rows.map((row) => ({ id: String(row.id), subjectId: String(row.subject_id) }));
  }

  async createCollection(userId: string, title: string): Promise<{ id: string }> {
    const result = await this.pool.query(
      `insert into collections (owner_user_id, title, visibility) values ($1, $2, 'private') returning id`,
      [userId, title],
    );
    return { id: String(result.rows[0].id) };
  }

  async listCollections(userId: string): Promise<{ id: string; title: string }[]> {
    const result = await this.pool.query(
      `select id, title from collections where owner_user_id = $1 and deleted_at is null order by created_at desc`,
      [userId],
    );
    return result.rows.map((row) => ({ id: String(row.id), title: String(row.title) }));
  }

  async recordView(userId: string, subjectId: string): Promise<void> {
    await this.assertLiveSubject(subjectId);
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query("insert into recent_views (user_id, subject_id) values ($1, $2)", [userId, subjectId]);
      await client.query(
        `delete from recent_views where user_id = $1 and id not in (
           select id from recent_views where user_id = $1 order by viewed_at desc limit $2
         )`,
        [userId, limits.recentViewCap],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  private async assertLiveSubject(subjectId: string): Promise<void> {
    const result = await this.pool.query("select 1 from catalog_subjects where id = $1 and deleted_at is null and status = 'active'", [subjectId]);
    if (!result.rowCount) {
      throw new AppError(ErrorCodes.NOT_FOUND, "That item is no longer available.", 404);
    }
  }
}

function isUnique(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
