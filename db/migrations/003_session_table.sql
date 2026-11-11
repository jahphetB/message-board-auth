BEGIN;

CREATE TABLE session (
	sid VARCHAR NOT NULL PRIMARY KEY,
	sess JSON NOT NULL,
	expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX session_expire_idx ON session (expire);

COMMIT;
