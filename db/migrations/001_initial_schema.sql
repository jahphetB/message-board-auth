BEGIN;

CREATE TABLE users (
	id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	first_name VARCHAR(100) NOT NULL CHECK (char_length(btrim(first_name)) BETWEEN 1 AND 100),
	last_name VARCHAR(100) NOT NULL CHECK (char_length(btrim(last_name)) BETWEEN 1 AND 100),
	username VARCHAR(30) NOT NULL CHECK (username ~ '^[A-Za-z0-9_]{3,30}$'),
	password_hash TEXT NOT NULL,
	is_member BOOLEAN NOT NULL DEFAULT FALSE,
	is_admin BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX users_username_lower_unique ON users (lower(username));

CREATE TABLE messages (
	id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users (id),
	title VARCHAR(120) NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
	text VARCHAR(2000) NOT NULL CHECK (char_length(btrim(text)) BETWEEN 1 AND 2000),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
