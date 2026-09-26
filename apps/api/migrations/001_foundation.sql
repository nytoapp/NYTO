-- Atlas foundation schema. Canonical migration. Identifiers default to UUIDv7.
-- PostgreSQL 16 has no built-in uuidv7(), so atlas_uuidv7() implements RFC 9562 layout.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE schema_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE OR REPLACE FUNCTION atlas_uuidv7() RETURNS uuid
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  unix_ts_ms bytea;
  uuid_bytes bytea;
BEGIN
  unix_ts_ms := substring(int8send((floor(extract(epoch FROM clock_timestamp()) * 1000))::bigint) FROM 3);
  uuid_bytes := unix_ts_ms || gen_random_bytes(10);
  uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
  uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
  RETURN encode(uuid_bytes, 'hex')::uuid;
END
$$;

CREATE OR REPLACE FUNCTION atlas_set_updated_at() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END
$$;

CREATE TABLE currency_codes (
  code char(3) PRIMARY KEY,
  minor_unit_exponent smallint NOT NULL CHECK (minor_unit_exponent BETWEEN 0 AND 4)
);

CREATE TABLE countries (
  iso_code char(2) PRIMARY KEY,
  default_currency char(3) NOT NULL REFERENCES currency_codes (code),
  default_locale text NOT NULL,
  distance_unit text NOT NULL CHECK (distance_unit IN ('metric', 'imperial'))
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  status text NOT NULL CHECK (status IN ('active', 'pending_deletion', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz
);

CREATE TABLE user_profiles (
  user_id uuid PRIMARY KEY REFERENCES users (id),
  display_name text,
  locale text NOT NULL,
  preferred_currency char(3) REFERENCES currency_codes (code),
  distance_unit text NOT NULL CHECK (distance_unit IN ('metric', 'imperial')),
  personalization_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE auth_identities (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  user_id uuid NOT NULL REFERENCES users (id),
  provider text NOT NULL CHECK (provider IN ('google', 'apple', 'phone', 'email')),
  provider_subject text NOT NULL,
  email text,
  email_verified_at timestamptz,
  phone_e164 text,
  phone_verified_at timestamptz,
  password_hash text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (provider, provider_subject)
);

CREATE UNIQUE INDEX auth_identities_email_unique ON auth_identities (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX auth_identities_phone_unique ON auth_identities (phone_e164) WHERE phone_e164 IS NOT NULL;

CREATE TABLE devices (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  user_id uuid NOT NULL REFERENCES users (id),
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  label text,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX devices_user_idx ON devices (user_id, revoked_at);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  user_id uuid NOT NULL REFERENCES users (id),
  device_id uuid NOT NULL REFERENCES devices (id),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_seen_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX sessions_user_idx ON sessions (user_id, revoked_at);

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  session_id uuid NOT NULL REFERENCES sessions (id),
  token_hash text NOT NULL UNIQUE,
  family_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  rotated_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX refresh_tokens_family_idx ON refresh_tokens (family_id);

CREATE TABLE user_roles (
  user_id uuid NOT NULL REFERENCES users (id),
  role text NOT NULL CHECK (role IN ('user', 'moderator', 'admin', 'system')),
  granted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  granted_by uuid REFERENCES users (id),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE auth_challenges (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  channel text NOT NULL CHECK (channel IN ('phone', 'email')),
  target text NOT NULL,
  code_hash text NOT NULL,
  pending_password_hash text,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX auth_challenges_target_idx ON auth_challenges (channel, target, created_at DESC);

CREATE TABLE consent_records (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  user_id uuid NOT NULL REFERENCES users (id),
  document_type text NOT NULL CHECK (document_type IN ('terms', 'privacy', 'personalization')),
  document_version text NOT NULL,
  granted boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  user_id uuid NOT NULL REFERENCES users (id),
  status text NOT NULL CHECK (status IN ('requested', 'processing', 'completed', 'cancelled')),
  requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  grace_ends_at timestamptz NOT NULL,
  completed_at timestamptz
);

CREATE UNIQUE INDEX account_deletion_open_unique
  ON account_deletion_requests (user_id)
  WHERE status IN ('requested', 'processing');

CREATE TABLE idempotency_keys (
  user_id uuid NOT NULL REFERENCES users (id),
  key text NOT NULL,
  request_hash text NOT NULL,
  response_status integer NOT NULL,
  response_body jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (user_id, key)
);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  actor_user_id uuid,
  actor_role text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  request_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text
);

CREATE INDEX audit_events_occurred_idx ON audit_events (occurred_at);
CREATE INDEX audit_events_actor_idx ON audit_events (actor_user_id, occurred_at);

CREATE TABLE resolved_locations (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  kind text NOT NULL CHECK (kind IN ('locality', 'neighborhood', 'point')),
  label text NOT NULL,
  country_code char(2) NOT NULL REFERENCES countries (iso_code),
  timezone text NOT NULL,
  geog geography(Point, 4326) NOT NULL,
  external_place_id text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX resolved_locations_geog_gix ON resolved_locations USING gist (geog);
CREATE INDEX resolved_locations_label_idx ON resolved_locations (country_code, label);

CREATE TABLE catalog_subjects (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  kind text NOT NULL CHECK (kind IN ('place', 'accommodation', 'event', 'experience', 'activity', 'media')),
  status text NOT NULL CHECK (status IN ('draft', 'active', 'unavailable', 'deleted')),
  default_locale text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz
);

CREATE INDEX catalog_subjects_kind_idx ON catalog_subjects (kind, status) WHERE deleted_at IS NULL;

CREATE TABLE subject_translations (
  subject_id uuid NOT NULL REFERENCES catalog_subjects (id),
  locale text NOT NULL,
  name text NOT NULL,
  summary text,
  PRIMARY KEY (subject_id, locale)
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  parent_id uuid REFERENCES categories (id),
  slug text NOT NULL,
  path text NOT NULL,
  kind_affinity text,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('active', 'retired')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX categories_slug_live ON categories (slug) WHERE deleted_at IS NULL;

CREATE TABLE category_translations (
  category_id uuid NOT NULL REFERENCES categories (id),
  locale text NOT NULL,
  name text NOT NULL,
  PRIMARY KEY (category_id, locale)
);

CREATE TABLE subject_categories (
  subject_id uuid NOT NULL REFERENCES catalog_subjects (id),
  category_id uuid NOT NULL REFERENCES categories (id),
  is_primary boolean NOT NULL DEFAULT false,
  PRIMARY KEY (subject_id, category_id)
);

CREATE UNIQUE INDEX subject_categories_one_primary
  ON subject_categories (subject_id)
  WHERE is_primary;

CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  slug text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'retired')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX tags_slug_live ON tags (slug) WHERE deleted_at IS NULL;

CREATE TABLE tag_translations (
  tag_id uuid NOT NULL REFERENCES tags (id),
  locale text NOT NULL,
  name text NOT NULL,
  PRIMARY KEY (tag_id, locale)
);

CREATE TABLE subject_tags (
  subject_id uuid NOT NULL REFERENCES catalog_subjects (id),
  tag_id uuid NOT NULL REFERENCES tags (id),
  PRIMARY KEY (subject_id, tag_id)
);

CREATE TABLE places (
  subject_id uuid PRIMARY KEY REFERENCES catalog_subjects (id),
  geog geography(Point, 4326) NOT NULL,
  country_code char(2) NOT NULL REFERENCES countries (iso_code),
  timezone text NOT NULL,
  street_line text,
  locality text,
  admin_area text,
  postal_code text,
  phone_e164 text,
  website_host text
);

CREATE INDEX places_geog_gix ON places USING gist (geog);
CREATE INDEX places_country_locality_idx ON places (country_code, locality);

CREATE TABLE place_hours (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  place_subject_id uuid NOT NULL REFERENCES places (subject_id),
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  opens_local time NOT NULL,
  closes_local time NOT NULL,
  spans_next_day boolean NOT NULL DEFAULT false,
  UNIQUE (place_subject_id, weekday, opens_local)
);

CREATE TABLE accommodations (
  subject_id uuid PRIMARY KEY REFERENCES catalog_subjects (id),
  place_subject_id uuid REFERENCES places (subject_id),
  property_class text NOT NULL CHECK (property_class IN ('hotel', 'hostel', 'resort', 'serviced_apartment', 'other'))
);

CREATE TABLE events (
  subject_id uuid PRIMARY KEY REFERENCES catalog_subjects (id),
  attendance_mode_default text NOT NULL CHECK (attendance_mode_default IN ('offline', 'online', 'hybrid')),
  performer_credits text,
  media_subject_id uuid REFERENCES catalog_subjects (id)
);

CREATE TABLE event_occurrences (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  event_subject_id uuid NOT NULL REFERENCES events (subject_id),
  place_subject_id uuid REFERENCES places (subject_id),
  status text NOT NULL CHECK (status IN ('scheduled', 'cancelled', 'postponed', 'rescheduled')),
  rescheduled_to_id uuid REFERENCES event_occurrences (id),
  attendance_mode text NOT NULL CHECK (attendance_mode IN ('offline', 'online', 'hybrid')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  timezone text NOT NULL,
  country_code char(2) REFERENCES countries (iso_code),
  locality_label text,
  geog geography(Point, 4326),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX event_occurrences_starts_idx
  ON event_occurrences (starts_at)
  WHERE status = 'scheduled' AND deleted_at IS NULL;
CREATE INDEX event_occurrences_geog_gix ON event_occurrences USING gist (geog);

CREATE TABLE engagements (
  subject_id uuid PRIMARY KEY REFERENCES catalog_subjects (id),
  engagement_kind text NOT NULL CHECK (engagement_kind IN ('experience', 'activity')),
  place_subject_id uuid REFERENCES places (subject_id),
  duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes > 0)
);

CREATE TABLE media_titles (
  subject_id uuid PRIMARY KEY REFERENCES catalog_subjects (id),
  media_type text NOT NULL CHECK (media_type IN ('movie', 'show', 'performance')),
  release_year integer,
  runtime_minutes integer
);

CREATE TABLE providers (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'disabled')),
  storage_policy text NOT NULL CHECK (storage_policy IN ('live', 'session', 'ttl', 'licensed_store')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE provider_capabilities (
  provider_id uuid NOT NULL REFERENCES providers (id),
  capability text NOT NULL CHECK (capability IN ('search', 'suggest', 'details', 'media', 'ratings', 'reviews', 'destination')),
  enabled boolean NOT NULL,
  PRIMARY KEY (provider_id, capability)
);

CREATE TABLE provider_regions (
  provider_id uuid NOT NULL REFERENCES providers (id),
  country_code char(2) NOT NULL REFERENCES countries (iso_code),
  enabled boolean NOT NULL,
  PRIMARY KEY (provider_id, country_code)
);

CREATE TABLE provider_runtime_config (
  provider_id uuid PRIMARY KEY REFERENCES providers (id),
  timeout_ms integer NOT NULL CHECK (timeout_ms > 0),
  max_concurrency integer NOT NULL CHECK (max_concurrency > 0),
  qps_limit integer NOT NULL CHECK (qps_limit > 0),
  circuit_failure_threshold integer NOT NULL CHECK (circuit_failure_threshold > 0),
  circuit_open_ms integer NOT NULL CHECK (circuit_open_ms > 0),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE external_references (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  provider_id uuid NOT NULL REFERENCES providers (id),
  subject_id uuid NOT NULL REFERENCES catalog_subjects (id),
  external_id text NOT NULL,
  confidence numeric(4, 3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  match_method text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (provider_id, external_id),
  UNIQUE (provider_id, subject_id)
);

CREATE TABLE external_destinations (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  provider_id uuid NOT NULL REFERENCES providers (id),
  subject_id uuid REFERENCES catalog_subjects (id),
  occurrence_id uuid REFERENCES event_occurrences (id),
  destination_type text NOT NULL CHECK (destination_type IN ('view_map', 'view_provider', 'book', 'tickets', 'website', 'directions')),
  allowed_hosts text[] NOT NULL,
  allowed_schemes text[] NOT NULL DEFAULT ARRAY['https']::text[],
  preferred_url text,
  fallback_url text,
  label text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'unavailable', 'expired')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (subject_id IS NOT NULL OR occurrence_id IS NOT NULL)
);

CREATE INDEX external_destinations_subject_idx ON external_destinations (subject_id);

CREATE TABLE search_documents (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  document_type text NOT NULL CHECK (document_type IN ('subject', 'occurrence')),
  subject_id uuid NOT NULL REFERENCES catalog_subjects (id),
  occurrence_id uuid REFERENCES event_occurrences (id),
  locale text NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  search_vector tsvector NOT NULL,
  geog geography(Point, 4326),
  country_code char(2),
  starts_at timestamptz,
  category_slugs text[] NOT NULL DEFAULT ARRAY[]::text[],
  tag_slugs text[] NOT NULL DEFAULT ARRAY[]::text[],
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE UNIQUE INDEX search_documents_subject_locale
  ON search_documents (subject_id, locale)
  WHERE occurrence_id IS NULL;
CREATE UNIQUE INDEX search_documents_occurrence_locale
  ON search_documents (occurrence_id, locale)
  WHERE occurrence_id IS NOT NULL;
CREATE INDEX search_documents_vector_gix ON search_documents USING gin (search_vector);
CREATE INDEX search_documents_title_trgm ON search_documents USING gin (title gin_trgm_ops);
CREATE INDEX search_documents_geog_gix ON search_documents USING gist (geog);
CREATE INDEX search_documents_filter_idx ON search_documents (country_code, kind, starts_at);

CREATE TABLE saved_items (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  user_id uuid NOT NULL REFERENCES users (id),
  subject_id uuid NOT NULL REFERENCES catalog_subjects (id),
  occurrence_id uuid REFERENCES event_occurrences (id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE UNIQUE INDEX saved_items_subject_unique
  ON saved_items (user_id, subject_id)
  WHERE occurrence_id IS NULL;
CREATE UNIQUE INDEX saved_items_occurrence_unique
  ON saved_items (user_id, occurrence_id)
  WHERE occurrence_id IS NOT NULL;

CREATE TABLE collections (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  owner_user_id uuid NOT NULL REFERENCES users (id),
  title text NOT NULL,
  description text,
  visibility text NOT NULL CHECK (visibility IN ('private', 'unlisted')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz
);

CREATE TABLE collection_items (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  collection_id uuid NOT NULL REFERENCES collections (id),
  subject_id uuid NOT NULL REFERENCES catalog_subjects (id),
  occurrence_id uuid REFERENCES event_occurrences (id),
  position integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE UNIQUE INDEX collection_items_subject_unique
  ON collection_items (collection_id, subject_id)
  WHERE occurrence_id IS NULL;
CREATE UNIQUE INDEX collection_items_occurrence_unique
  ON collection_items (collection_id, occurrence_id)
  WHERE occurrence_id IS NOT NULL;

CREATE TABLE recent_views (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  user_id uuid NOT NULL REFERENCES users (id),
  subject_id uuid NOT NULL REFERENCES catalog_subjects (id),
  viewed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX recent_views_user_idx ON recent_views (user_id, viewed_at DESC);

CREATE TABLE trips (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  owner_user_id uuid NOT NULL REFERENCES users (id),
  destination_location_id uuid NOT NULL REFERENCES resolved_locations (id),
  title text,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  timezone text NOT NULL,
  party_size integer CHECK (party_size IS NULL OR party_size > 0),
  notes text,
  status text NOT NULL CHECK (status IN ('draft', 'upcoming', 'past', 'archived')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  CHECK (ends_on >= starts_on)
);

CREATE INDEX trips_owner_idx ON trips (owner_user_id, starts_on) WHERE deleted_at IS NULL;

CREATE TABLE trip_days (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  trip_id uuid NOT NULL REFERENCES trips (id),
  civil_date date NOT NULL,
  position integer NOT NULL,
  UNIQUE (trip_id, civil_date)
);

CREATE TABLE trip_items (
  id uuid PRIMARY KEY DEFAULT atlas_uuidv7(),
  trip_id uuid NOT NULL REFERENCES trips (id),
  trip_day_id uuid REFERENCES trip_days (id),
  subject_id uuid NOT NULL REFERENCES catalog_subjects (id),
  occurrence_id uuid REFERENCES event_occurrences (id),
  slot text NOT NULL CHECK (slot IN ('morning', 'lunch', 'afternoon', 'dinner', 'night', 'unscheduled')),
  local_time time,
  venue_timezone text,
  notes text,
  position integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE feature_flags (
  key text PRIMARY KEY,
  description text NOT NULL,
  enabled boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION atlas_set_updated_at();
CREATE TRIGGER user_profiles_set_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION atlas_set_updated_at();
