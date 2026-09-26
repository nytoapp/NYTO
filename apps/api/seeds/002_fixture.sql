-- FIXTURE / DEVELOPMENT DATA. Not production content.
-- Every subject is linked to provider code "fixture".

INSERT INTO currency_codes (code, minor_unit_exponent) VALUES
  ('USD', 2),
  ('EUR', 2),
  ('INR', 2),
  ('GBP', 2),
  ('JPY', 0),
  ('AED', 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO countries (iso_code, default_currency, default_locale, distance_unit) VALUES
  ('FR', 'EUR', 'fr', 'metric'),
  ('IN', 'INR', 'en', 'metric'),
  ('US', 'USD', 'en', 'imperial'),
  ('GB', 'GBP', 'en', 'imperial'),
  ('JP', 'JPY', 'ja', 'metric'),
  ('AE', 'AED', 'ar', 'metric')
ON CONFLICT (iso_code) DO NOTHING;

INSERT INTO resolved_locations (id, kind, label, country_code, timezone, geog) VALUES
  ('018f5c3a-7c3a-7000-8000-0000000000a1', 'locality', 'Paris', 'FR', 'Europe/Paris', ST_SetSRID(ST_MakePoint(2.3522, 48.8566), 4326)::geography),
  ('018f5c3a-7c3a-7000-8000-0000000000a2', 'locality', 'Paris', 'US', 'America/Chicago', ST_SetSRID(ST_MakePoint(-95.5555, 33.6609), 4326)::geography),
  ('018f5c3a-7c3a-7000-8000-0000000000a3', 'locality', 'Bengaluru', 'IN', 'Asia/Kolkata', ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326)::geography)
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, parent_id, slug, path, kind_affinity, sort_order, status) VALUES
  ('018f5c3a-7c3a-7000-8000-0000000000d1', NULL, 'restaurant', 'restaurant', 'place', 1, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000d2', '018f5c3a-7c3a-7000-8000-0000000000d1', 'italian', 'restaurant/italian', 'place', 2, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000d3', NULL, 'hotel', 'hotel', 'accommodation', 3, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000d4', NULL, 'movie', 'movie', 'media', 4, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000d5', NULL, 'concert', 'concert', 'event', 5, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000d6', NULL, 'cafe', 'cafe', 'place', 6, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO category_translations (category_id, locale, name) VALUES
  ('018f5c3a-7c3a-7000-8000-0000000000d1', 'en', 'Restaurants'),
  ('018f5c3a-7c3a-7000-8000-0000000000d2', 'en', 'Italian'),
  ('018f5c3a-7c3a-7000-8000-0000000000d3', 'en', 'Hotels'),
  ('018f5c3a-7c3a-7000-8000-0000000000d4', 'en', 'Movies'),
  ('018f5c3a-7c3a-7000-8000-0000000000d5', 'en', 'Concerts'),
  ('018f5c3a-7c3a-7000-8000-0000000000d6', 'en', 'Cafes')
ON CONFLICT DO NOTHING;

INSERT INTO tags (id, slug, status) VALUES
  ('018f5c3a-7c3a-7000-8000-0000000000e1', 'romantic', 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000e2', 'outdoors', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tag_translations (tag_id, locale, name) VALUES
  ('018f5c3a-7c3a-7000-8000-0000000000e1', 'en', 'Romantic'),
  ('018f5c3a-7c3a-7000-8000-0000000000e2', 'en', 'Outdoors')
ON CONFLICT DO NOTHING;

INSERT INTO catalog_subjects (id, kind, status, default_locale) VALUES
  ('018f5c3a-7c3a-7000-8000-0000000000b1', 'place', 'active', 'en'),
  ('018f5c3a-7c3a-7000-8000-0000000000b2', 'accommodation', 'active', 'en'),
  ('018f5c3a-7c3a-7000-8000-0000000000b3', 'event', 'active', 'en'),
  ('018f5c3a-7c3a-7000-8000-0000000000b5', 'experience', 'active', 'en'),
  ('018f5c3a-7c3a-7000-8000-0000000000b6', 'activity', 'active', 'en'),
  ('018f5c3a-7c3a-7000-8000-0000000000b7', 'media', 'active', 'en'),
  ('018f5c3a-7c3a-7000-8000-0000000000b8', 'place', 'active', 'en')
ON CONFLICT (id) DO NOTHING;

INSERT INTO subject_translations (subject_id, locale, name, summary) VALUES
  ('018f5c3a-7c3a-7000-8000-0000000000b1', 'en', 'Osteria del Fixture', 'Fixture Italian restaurant in Paris. Not a real listing.'),
  ('018f5c3a-7c3a-7000-8000-0000000000b2', 'en', 'Hotel Fixture Marais', 'Fixture hotel in Paris. Not a real listing.'),
  ('018f5c3a-7c3a-7000-8000-0000000000b3', 'en', 'Fixture Quartet', 'Fixture concert. Not a real event.'),
  ('018f5c3a-7c3a-7000-8000-0000000000b5', 'en', 'Fixture Cooking Class', 'Fixture experience. Not bookable.'),
  ('018f5c3a-7c3a-7000-8000-0000000000b6', 'en', 'Fixture Ridge Walk', 'Fixture outdoor activity.'),
  ('018f5c3a-7c3a-7000-8000-0000000000b7', 'en', 'Interstellar', 'Fixture media title used for search tests.'),
  ('018f5c3a-7c3a-7000-8000-0000000000b8', 'en', 'Fixture Coffee Bengaluru', 'Fixture cafe. Not a real listing.')
ON CONFLICT DO NOTHING;

INSERT INTO places (subject_id, geog, country_code, timezone, street_line, locality, website_host) VALUES
  ('018f5c3a-7c3a-7000-8000-0000000000b1', ST_SetSRID(ST_MakePoint(2.3620, 48.8580), 4326)::geography, 'FR', 'Europe/Paris', '1 Rue Fixture', 'Paris', 'example.com'),
  ('018f5c3a-7c3a-7000-8000-0000000000b8', ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326)::geography, 'IN', 'Asia/Kolkata', '1 Fixture Lane', 'Bengaluru', 'example.com')
ON CONFLICT (subject_id) DO NOTHING;

INSERT INTO place_hours (place_subject_id, weekday, opens_local, closes_local) VALUES
  ('018f5c3a-7c3a-7000-8000-0000000000b1', 6, '12:00', '23:00')
ON CONFLICT DO NOTHING;

INSERT INTO accommodations (subject_id, place_subject_id, property_class) VALUES
  ('018f5c3a-7c3a-7000-8000-0000000000b2', NULL, 'hotel')
ON CONFLICT (subject_id) DO NOTHING;

INSERT INTO events (subject_id, attendance_mode_default, performer_credits) VALUES
  ('018f5c3a-7c3a-7000-8000-0000000000b3', 'offline', 'Fixture Quartet')
ON CONFLICT (subject_id) DO NOTHING;

INSERT INTO event_occurrences (
  id, event_subject_id, place_subject_id, status, attendance_mode, starts_at, ends_at, timezone, country_code, locality_label, geog
) VALUES (
  '018f5c3a-7c3a-7000-8000-0000000000b4',
  '018f5c3a-7c3a-7000-8000-0000000000b3',
  '018f5c3a-7c3a-7000-8000-0000000000b1',
  'scheduled',
  'offline',
  ((date_trunc('week', timezone('Europe/Paris', clock_timestamp())) + interval '5 days' + interval '20 hours') AT TIME ZONE 'Europe/Paris'),
  ((date_trunc('week', timezone('Europe/Paris', clock_timestamp())) + interval '5 days' + interval '22 hours') AT TIME ZONE 'Europe/Paris'),
  'Europe/Paris',
  'FR',
  'Paris',
  ST_SetSRID(ST_MakePoint(2.3620, 48.8580), 4326)::geography
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO engagements (subject_id, engagement_kind, place_subject_id, duration_minutes) VALUES
  ('018f5c3a-7c3a-7000-8000-0000000000b5', 'experience', '018f5c3a-7c3a-7000-8000-0000000000b1', 120),
  ('018f5c3a-7c3a-7000-8000-0000000000b6', 'activity', NULL, 180)
ON CONFLICT (subject_id) DO NOTHING;

INSERT INTO media_titles (subject_id, media_type, release_year, runtime_minutes) VALUES
  ('018f5c3a-7c3a-7000-8000-0000000000b7', 'movie', 2014, 169)
ON CONFLICT (subject_id) DO NOTHING;

INSERT INTO subject_categories (subject_id, category_id, is_primary) VALUES
  ('018f5c3a-7c3a-7000-8000-0000000000b1', '018f5c3a-7c3a-7000-8000-0000000000d1', true),
  ('018f5c3a-7c3a-7000-8000-0000000000b1', '018f5c3a-7c3a-7000-8000-0000000000d2', false),
  ('018f5c3a-7c3a-7000-8000-0000000000b2', '018f5c3a-7c3a-7000-8000-0000000000d3', true),
  ('018f5c3a-7c3a-7000-8000-0000000000b3', '018f5c3a-7c3a-7000-8000-0000000000d5', true),
  ('018f5c3a-7c3a-7000-8000-0000000000b7', '018f5c3a-7c3a-7000-8000-0000000000d4', true),
  ('018f5c3a-7c3a-7000-8000-0000000000b8', '018f5c3a-7c3a-7000-8000-0000000000d6', true)
ON CONFLICT DO NOTHING;

INSERT INTO subject_tags (subject_id, tag_id) VALUES
  ('018f5c3a-7c3a-7000-8000-0000000000b1', '018f5c3a-7c3a-7000-8000-0000000000e1'),
  ('018f5c3a-7c3a-7000-8000-0000000000b6', '018f5c3a-7c3a-7000-8000-0000000000e2')
ON CONFLICT DO NOTHING;

INSERT INTO providers (id, code, display_name, status, storage_policy) VALUES
  ('018f5c3a-7c3a-7000-8000-0000000000c1', 'fixture', 'Fixture catalog (development only)', 'active', 'licensed_store')
ON CONFLICT (code) DO NOTHING;

INSERT INTO provider_capabilities (provider_id, capability, enabled) VALUES
  ('018f5c3a-7c3a-7000-8000-0000000000c1', 'search', true),
  ('018f5c3a-7c3a-7000-8000-0000000000c1', 'destination', true)
ON CONFLICT DO NOTHING;

INSERT INTO provider_runtime_config (provider_id, timeout_ms, max_concurrency, qps_limit, circuit_failure_threshold, circuit_open_ms)
VALUES ('018f5c3a-7c3a-7000-8000-0000000000c1', 800, 4, 50, 5, 30000)
ON CONFLICT (provider_id) DO NOTHING;

INSERT INTO external_references (provider_id, subject_id, external_id, confidence, match_method)
SELECT '018f5c3a-7c3a-7000-8000-0000000000c1', id, id::text, 1.000, 'fixture_seed'
FROM catalog_subjects
ON CONFLICT DO NOTHING;

INSERT INTO external_destinations (
  id, provider_id, subject_id, destination_type, allowed_hosts, allowed_schemes, preferred_url, fallback_url, label, status
) VALUES (
  '018f5c3a-7c3a-7000-8000-0000000000f1',
  '018f5c3a-7c3a-7000-8000-0000000000c1',
  '018f5c3a-7c3a-7000-8000-0000000000b1',
  'website',
  ARRAY['example.com']::text[],
  ARRAY['https']::text[],
  'https://example.com/fixture/osteria',
  'https://example.com/fixture/osteria',
  'Visit website',
  'active'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO search_documents (
  document_type, subject_id, occurrence_id, locale, kind, title, search_vector, geog, country_code, starts_at, category_slugs, tag_slugs
)
SELECT
  'subject',
  s.id,
  NULL,
  'en',
  s.kind,
  t.name,
  to_tsvector('english', t.name || ' ' || coalesce(t.summary, '')),
  p.geog,
  p.country_code,
  NULL,
  coalesce((SELECT array_agg(c.slug) FROM subject_categories sc JOIN categories c ON c.id = sc.category_id WHERE sc.subject_id = s.id), ARRAY[]::text[]),
  coalesce((SELECT array_agg(tg.slug) FROM subject_tags st JOIN tags tg ON tg.id = st.tag_id WHERE st.subject_id = s.id), ARRAY[]::text[])
FROM catalog_subjects s
JOIN subject_translations t ON t.subject_id = s.id AND t.locale = 'en'
LEFT JOIN places p ON p.subject_id = s.id
WHERE NOT EXISTS (
  SELECT 1 FROM search_documents d WHERE d.subject_id = s.id AND d.occurrence_id IS NULL AND d.locale = 'en'
);

INSERT INTO search_documents (
  document_type, subject_id, occurrence_id, locale, kind, title, search_vector, geog, country_code, starts_at, category_slugs, tag_slugs
)
SELECT
  'occurrence',
  o.event_subject_id,
  o.id,
  'en',
  'event',
  t.name,
  to_tsvector('english', t.name || ' concert paris'),
  o.geog,
  o.country_code,
  o.starts_at,
  ARRAY['concert']::text[],
  ARRAY[]::text[]
FROM event_occurrences o
JOIN subject_translations t ON t.subject_id = o.event_subject_id AND t.locale = 'en'
WHERE NOT EXISTS (
  SELECT 1 FROM search_documents d WHERE d.occurrence_id = o.id AND d.locale = 'en'
);

-- Hotel needs a point for "hotels in Paris" even though the stay is not the place row.
UPDATE search_documents
SET geog = ST_SetSRID(ST_MakePoint(2.3550, 48.8600), 4326)::geography,
    country_code = 'FR'
WHERE subject_id = '018f5c3a-7c3a-7000-8000-0000000000b2'
  AND geog IS NULL;

INSERT INTO feature_flags (key, description, enabled) VALUES
  ('llm_intent', 'Natural language model interpreter', false),
  ('fixture_provider', 'Development fixture adapter', true)
ON CONFLICT (key) DO NOTHING;
