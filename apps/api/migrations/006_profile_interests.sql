-- Interests belong to the CITYDAY account, not to the phone.
-- Ids match the mobile interest list. An empty list is allowed.

ALTER TABLE user_profiles
  ADD COLUMN interest_ids text[] NOT NULL DEFAULT '{}';

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_interest_ids_known
  CHECK (
    interest_ids <@ ARRAY[
      'food',
      'music',
      'culture',
      'outdoors',
      'shopping',
      'nightlife',
      'activities',
      'wellness',
      'surprise'
    ]::text[]
  );
