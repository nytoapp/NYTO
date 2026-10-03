-- Europe-first reference data. Existing rows are left unchanged.
-- Sweden is SE. The schema stores ISO alpha-2 only.
-- Bulgaria's official currency is EUR as of 1 January 2026. BGN remains available.
-- No localities: resolved_locations.geog is required, and the repository has no Stockholm coordinates.
-- No catalog subjects.

INSERT INTO currency_codes (code, minor_unit_exponent) VALUES
  ('SEK', 2),
  ('DKK', 2),
  ('PLN', 2),
  ('CZK', 2),
  ('HUF', 2),
  ('RON', 2),
  ('BGN', 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO countries (iso_code, default_currency, default_locale, distance_unit) VALUES
  ('AT', 'EUR', 'de', 'metric'),
  ('BE', 'EUR', 'nl', 'metric'),
  ('BG', 'EUR', 'bg', 'metric'),
  ('HR', 'EUR', 'hr', 'metric'),
  ('CY', 'EUR', 'el', 'metric'),
  ('CZ', 'CZK', 'cs', 'metric'),
  ('DK', 'DKK', 'da', 'metric'),
  ('EE', 'EUR', 'et', 'metric'),
  ('FI', 'EUR', 'fi', 'metric'),
  ('DE', 'EUR', 'de', 'metric'),
  ('GR', 'EUR', 'el', 'metric'),
  ('HU', 'HUF', 'hu', 'metric'),
  ('IE', 'EUR', 'en', 'metric'),
  ('IT', 'EUR', 'it', 'metric'),
  ('LV', 'EUR', 'lv', 'metric'),
  ('LT', 'EUR', 'lt', 'metric'),
  ('LU', 'EUR', 'lb', 'metric'),
  ('MT', 'EUR', 'mt', 'metric'),
  ('NL', 'EUR', 'nl', 'metric'),
  ('PL', 'PLN', 'pl', 'metric'),
  ('PT', 'EUR', 'pt', 'metric'),
  ('RO', 'RON', 'ro', 'metric'),
  ('SK', 'EUR', 'sk', 'metric'),
  ('SI', 'EUR', 'sl', 'metric'),
  ('ES', 'EUR', 'es', 'metric'),
  ('SE', 'SEK', 'sv', 'metric')
ON CONFLICT (iso_code) DO NOTHING;

INSERT INTO categories (id, parent_id, slug, path, kind_affinity, sort_order, status) VALUES
  ('018f5c3a-7c3a-7000-8000-0000000000d7', NULL, 'nightlife', 'nightlife', 'place', 10, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000d8', '018f5c3a-7c3a-7000-8000-0000000000d7', 'bar', 'nightlife/bar', 'place', 11, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000d9', NULL, 'culture', 'culture', 'place', 12, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000da', '018f5c3a-7c3a-7000-8000-0000000000d9', 'museum', 'culture/museum', 'place', 13, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000db', NULL, 'attraction', 'attraction', 'place', 14, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000dc', NULL, 'activity', 'activity', 'activity', 15, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000dd', NULL, 'experience', 'experience', 'experience', 16, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000de', NULL, 'outdoors', 'outdoors', 'place', 17, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000df', NULL, 'shopping', 'shopping', 'place', 18, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000e0', NULL, 'wellness', 'wellness', 'place', 19, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000e3', NULL, 'event', 'event', 'event', 20, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000e4', '018f5c3a-7c3a-7000-8000-0000000000d1', 'french', 'restaurant/french', 'place', 30, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000e5', '018f5c3a-7c3a-7000-8000-0000000000d1', 'japanese', 'restaurant/japanese', 'place', 31, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000e6', '018f5c3a-7c3a-7000-8000-0000000000d1', 'indian', 'restaurant/indian', 'place', 32, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000e7', '018f5c3a-7c3a-7000-8000-0000000000d1', 'chinese', 'restaurant/chinese', 'place', 33, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000e8', '018f5c3a-7c3a-7000-8000-0000000000d1', 'mexican', 'restaurant/mexican', 'place', 34, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000e9', '018f5c3a-7c3a-7000-8000-0000000000d1', 'thai', 'restaurant/thai', 'place', 35, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000ea', '018f5c3a-7c3a-7000-8000-0000000000d1', 'korean', 'restaurant/korean', 'place', 36, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000eb', '018f5c3a-7c3a-7000-8000-0000000000d1', 'spanish', 'restaurant/spanish', 'place', 37, 'active'),
  ('018f5c3a-7c3a-7000-8000-0000000000ec', '018f5c3a-7c3a-7000-8000-0000000000d1', 'greek', 'restaurant/greek', 'place', 38, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO category_translations (category_id, locale, name) VALUES
  ('018f5c3a-7c3a-7000-8000-0000000000d7', 'en', 'Nightlife'),
  ('018f5c3a-7c3a-7000-8000-0000000000d8', 'en', 'Bars'),
  ('018f5c3a-7c3a-7000-8000-0000000000d9', 'en', 'Culture'),
  ('018f5c3a-7c3a-7000-8000-0000000000da', 'en', 'Museums'),
  ('018f5c3a-7c3a-7000-8000-0000000000db', 'en', 'Attractions'),
  ('018f5c3a-7c3a-7000-8000-0000000000dc', 'en', 'Activities'),
  ('018f5c3a-7c3a-7000-8000-0000000000dd', 'en', 'Experiences'),
  ('018f5c3a-7c3a-7000-8000-0000000000de', 'en', 'Parks & Outdoors'),
  ('018f5c3a-7c3a-7000-8000-0000000000df', 'en', 'Shopping'),
  ('018f5c3a-7c3a-7000-8000-0000000000e0', 'en', 'Wellness'),
  ('018f5c3a-7c3a-7000-8000-0000000000e3', 'en', 'Events'),
  ('018f5c3a-7c3a-7000-8000-0000000000e4', 'en', 'French'),
  ('018f5c3a-7c3a-7000-8000-0000000000e5', 'en', 'Japanese'),
  ('018f5c3a-7c3a-7000-8000-0000000000e6', 'en', 'Indian'),
  ('018f5c3a-7c3a-7000-8000-0000000000e7', 'en', 'Chinese'),
  ('018f5c3a-7c3a-7000-8000-0000000000e8', 'en', 'Mexican'),
  ('018f5c3a-7c3a-7000-8000-0000000000e9', 'en', 'Thai'),
  ('018f5c3a-7c3a-7000-8000-0000000000ea', 'en', 'Korean'),
  ('018f5c3a-7c3a-7000-8000-0000000000eb', 'en', 'Spanish'),
  ('018f5c3a-7c3a-7000-8000-0000000000ec', 'en', 'Greek')
ON CONFLICT (category_id, locale) DO NOTHING;
