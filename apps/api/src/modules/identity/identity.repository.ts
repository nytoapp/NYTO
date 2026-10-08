import type { Pool, PoolClient } from "pg";
import { limits } from "@atlas/config";
import { interestIds } from "@atlas/contracts";
import { newId } from "./crypto";

export type DeviceInput = { platform: "ios" | "android" | "web"; label?: string | null };
export type Principal = { userId: string; sessionId: string; roles: string[] };

type Queryable = Pool | PoolClient;

export class IdentityRepository {
  constructor(private readonly pool: Pool) {}

  async countRecentChallenges(channel: string, target: string): Promise<number> {
    const result = await this.pool.query(
      `select count(*)::int as count from auth_challenges
       where channel = $1 and target = $2 and created_at > clock_timestamp() - interval '1 hour'`,
      [channel, target],
    );
    return result.rows[0]?.count ?? 0;
  }

  async insertChallenge(channel: string, target: string, codeHash: string, pendingPasswordHash: string | null = null): Promise<{ id: string }> {
    const id = newId();
    await this.pool.query(
      `insert into auth_challenges (id, channel, target, code_hash, pending_password_hash, expires_at)
       values ($1, $2, $3, $4, $5, clock_timestamp() + ($6 || ' seconds')::interval)`,
      [id, channel, target, codeHash, pendingPasswordHash, String(limits.otpTtlSeconds)],
    );
    return { id };
  }

  async takeChallenge(channel: string, target: string, codeHash: string): Promise<{ passwordHash: string | null } | null> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const found = await client.query(
        `select id, attempts, pending_password_hash from auth_challenges
         where channel = $1 and target = $2 and consumed_at is null and expires_at > clock_timestamp()
         order by created_at desc limit 1 for update`,
        [channel, target],
      );
      const row = found.rows[0] as { id: string; attempts: number; pending_password_hash: string | null } | undefined;
      if (!row || row.attempts >= limits.otpMaxAttempts) {
        await client.query("rollback");
        return null;
      }
      const match = await client.query(
        `update auth_challenges set consumed_at = clock_timestamp()
         where id = $1 and code_hash = $2
         returning id`,
        [row.id, codeHash],
      );
      if (!match.rowCount) {
        await client.query("update auth_challenges set attempts = attempts + 1 where id = $1", [row.id]);
        await client.query("commit");
        return null;
      }
      await client.query("commit");
      return { passwordHash: row.pending_password_hash };
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async emailExists(email: string): Promise<boolean> {
    const result = await this.pool.query("select 1 from auth_identities where email = $1", [email.toLowerCase()]);
    return Boolean(result.rowCount);
  }

  async findEmailIdentity(email: string): Promise<{ userId: string; passwordHash: string | null } | null> {
    const result = await this.pool.query(
      `select user_id, password_hash from auth_identities
       where provider = 'email' and email = $1 and email_verified_at is not null`,
      [email.toLowerCase()],
    );
    const row = result.rows[0] as { user_id: string; password_hash: string | null } | undefined;
    return row ? { userId: row.user_id, passwordHash: row.password_hash } : null;
  }

  async findByProvider(provider: string, subject: string): Promise<{ userId: string } | null> {
    const result = await this.pool.query(
      "select user_id from auth_identities where provider = $1 and provider_subject = $2",
      [provider, subject],
    );
    const row = result.rows[0] as { user_id: string } | undefined;
    return row ? { userId: row.user_id } : null;
  }

  async createUserWithIdentity(input: {
    provider: "google" | "apple" | "phone" | "email";
    providerSubject: string;
    email: string | null;
    emailVerified: boolean;
    phone: string | null;
    passwordHash: string | null;
    displayName: string | null;
    device: DeviceInput;
  }): Promise<{ userId: string; sessionId: string }> {
    return this.inTransaction(async (client) => {
      const userId = newId();
      const deviceId = newId();
      const sessionId = newId();
      await client.query("insert into users (id, status) values ($1, 'active')", [userId]);
      await client.query(
        `insert into user_profiles (user_id, display_name, locale, distance_unit)
         values ($1, $2, 'en', 'metric')`,
        [userId, input.displayName],
      );
      await client.query("insert into user_roles (user_id, role) values ($1, 'user')", [userId]);
      await client.query(
        `insert into auth_identities
         (user_id, provider, provider_subject, email, email_verified_at, phone_e164, phone_verified_at, password_hash)
         values ($1, $2, $3, $4, case when $5 then clock_timestamp() else null end, $6, case when $6::text is not null then clock_timestamp() else null end, $7)`,
        [userId, input.provider, input.providerSubject, input.email, input.emailVerified, input.phone, input.passwordHash],
      );
      await this.insertDeviceAndSession(client, userId, deviceId, sessionId, input.device);
      return { userId, sessionId };
    });
  }

  async openSession(userId: string, device: DeviceInput): Promise<{ sessionId: string }> {
    return this.inTransaction(async (client) => {
      const deviceId = newId();
      const sessionId = newId();
      await this.insertDeviceAndSession(client, userId, deviceId, sessionId, device);
      return { sessionId };
    });
  }

  async linkIdentity(input: {
    userId: string;
    provider: "google" | "apple" | "phone" | "email";
    providerSubject: string;
    email: string | null;
    emailVerified: boolean;
  }): Promise<"linked" | "conflict" | "exists"> {
    const existing = await this.findByProvider(input.provider, input.providerSubject);
    if (existing?.userId === input.userId) {
      return "exists";
    }
    if (existing) {
      return "conflict";
    }
    await this.pool.query(
      `insert into auth_identities (user_id, provider, provider_subject, email, email_verified_at)
       values ($1, $2, $3, $4, case when $5 then clock_timestamp() else null end)`,
      [input.userId, input.provider, input.providerSubject, input.email, input.emailVerified],
    );
    return "linked";
  }

  async storeRefresh(sessionId: string, tokenHash: string, familyId: string): Promise<void> {
    await this.pool.query(
      `insert into refresh_tokens (session_id, token_hash, family_id, expires_at)
       values ($1, $2, $3, clock_timestamp() + ($4 || ' seconds')::interval)`,
      [sessionId, tokenHash, familyId, String(limits.refreshTokenTtlSeconds)],
    );
  }

  async rotateRefresh(oldHash: string, nextHash: string): Promise<{ sessionId: string; userId: string; familyId: string } | "reuse" | null> {
    return this.inTransaction(async (client) => {
      const found = await client.query(
        `select rt.id, rt.session_id, rt.family_id, rt.rotated_at, rt.revoked_at, rt.expires_at, s.user_id, s.revoked_at as session_revoked
         from refresh_tokens rt join sessions s on s.id = rt.session_id
         where rt.token_hash = $1 for update`,
        [oldHash],
      );
      const row = found.rows[0] as
        | {
            id: string;
            session_id: string;
            family_id: string;
            rotated_at: Date | null;
            revoked_at: Date | null;
            expires_at: Date;
            user_id: string;
            session_revoked: Date | null;
          }
        | undefined;
      if (!row || row.expires_at.getTime() < Date.now()) {
        return null;
      }
      if (row.rotated_at || row.revoked_at || row.session_revoked) {
        await client.query(
          "update refresh_tokens set revoked_at = coalesce(revoked_at, clock_timestamp()) where family_id = $1",
          [row.family_id],
        );
        await client.query("update sessions set revoked_at = coalesce(revoked_at, clock_timestamp()), revoke_reason = 'refresh_reuse' where id = $1", [
          row.session_id,
        ]);
        return "reuse";
      }
      await client.query("update refresh_tokens set rotated_at = clock_timestamp() where id = $1", [row.id]);
      await client.query(
        `insert into refresh_tokens (session_id, token_hash, family_id, expires_at)
         values ($1, $2, $3, clock_timestamp() + ($4 || ' seconds')::interval)`,
        [row.session_id, nextHash, row.family_id, String(limits.refreshTokenTtlSeconds)],
      );
      return { sessionId: row.session_id, userId: row.user_id, familyId: row.family_id };
    });
  }

  async revokeSession(sessionId: string, reason: string): Promise<void> {
    await this.pool.query("update sessions set revoked_at = clock_timestamp(), revoke_reason = $2 where id = $1 and revoked_at is null", [
      sessionId,
      reason,
    ]);
    await this.pool.query("update refresh_tokens set revoked_at = clock_timestamp() where session_id = $1 and revoked_at is null", [sessionId]);
  }

  async principalForSession(sessionId: string, userId: string): Promise<Principal | null> {
    const result = await this.pool.query(
      `select s.id, s.user_id
       from sessions s join users u on u.id = s.user_id
       where s.id = $1 and s.user_id = $2 and s.revoked_at is null and s.expires_at > clock_timestamp()
         and u.status = 'active' and u.deleted_at is null`,
      [sessionId, userId],
    );
    const row = result.rows[0] as { id: string; user_id: string } | undefined;
    if (!row) {
      return null;
    }
    const roles = await this.pool.query("select role from user_roles where user_id = $1", [userId]);
    return { userId, sessionId, roles: roles.rows.map((item: { role: string }) => item.role) };
  }

  async accountFor(userId: string): Promise<{ displayName: string | null; phoneE164: string | null; email: string | null; interestIds: string[] }> {
    const result = await this.pool.query(
      `select p.display_name,
              p.interest_ids,
              (select phone_e164 from auth_identities where user_id = p.user_id and phone_e164 is not null order by created_at asc limit 1) as phone_e164,
              (select email from auth_identities where user_id = p.user_id and email is not null order by created_at asc limit 1) as email
       from user_profiles p
       where p.user_id = $1`,
      [userId],
    );
    const row = result.rows[0] as
      | { display_name: string | null; phone_e164: string | null; email: string | null; interest_ids: unknown }
      | undefined;
    const displayName = row?.display_name?.trim() ?? "";
    const stored = Array.isArray(row?.interest_ids) ? row.interest_ids.filter((item): item is string => typeof item === "string") : [];
    return {
      displayName: displayName.length > 0 ? displayName : null,
      phoneE164: row?.phone_e164 ? String(row.phone_e164) : null,
      email: row?.email ? String(row.email) : null,
      interestIds: interestIds.filter((id) => stored.includes(id)),
    };
  }

  async setDisplayName(userId: string, displayName: string): Promise<boolean> {
    const updated = await this.pool.query(
      "update user_profiles set display_name = $2, updated_at = clock_timestamp() where user_id = $1",
      [userId, displayName],
    );
    return Boolean(updated.rowCount);
  }

  async setInterests(userId: string, ids: readonly string[]): Promise<boolean> {
    const ordered = interestIds.filter((id) => ids.includes(id));
    const updated = await this.pool.query(
      "update user_profiles set interest_ids = $2::text[], updated_at = clock_timestamp() where user_id = $1",
      [userId, ordered],
    );
    return Boolean(updated.rowCount);
  }

  async audit(action: string, requestId: string, actorUserId: string | null, targetId: string | null): Promise<void> {
    await this.pool.query(
      `insert into audit_events (action, target_type, target_id, request_id, actor_user_id, metadata)
       values ($1, 'auth', $2, $3, $4, '{}'::jsonb)`,
      [action, targetId, requestId, actorUserId],
    );
  }

  private async insertDeviceAndSession(client: Queryable, userId: string, deviceId: string, sessionId: string, device: DeviceInput) {
    await client.query("insert into devices (id, user_id, platform, label, last_seen_at) values ($1, $2, $3, $4, clock_timestamp())", [
      deviceId,
      userId,
      device.platform,
      device.label ?? null,
    ]);
    await client.query(
      `insert into sessions (id, user_id, device_id, expires_at)
       values ($1, $2, $3, clock_timestamp() + ($4 || ' seconds')::interval)`,
      [sessionId, userId, deviceId, String(limits.refreshTokenTtlSeconds)],
    );
  }

  private async inTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const result = await work(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
}
