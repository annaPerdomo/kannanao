-- Allow groups to have no emoji (nullable).
ALTER TABLE groups ALTER COLUMN emoji DROP NOT NULL;
ALTER TABLE groups ALTER COLUMN emoji SET DEFAULT NULL;
