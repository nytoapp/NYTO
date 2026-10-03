-- Reference data required before an admin can create a place.
-- Countries and currencies are the ISO set already defined for CITYDAY.
-- Categories are the existing discovery taxonomy, including the ids used by 003_place_admin.sql.
-- No catalog subjects, places, events, or search documents.

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
ON CONFLICT (category_id, locale) DO NOTHING;
