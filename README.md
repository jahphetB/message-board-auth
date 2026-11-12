# Members Only

[Live application](https://message-board-auth.jahphet.workers.dev/)

An authentication-enabled message board built with Express, EJS, PostgreSQL,
Passport Local, and Cloudflare Workers. This project uses a separate Neon
database and Worker from the original message board.

Visitors can read messages. Members and admins can also see authors and
timestamps; admins can delete messages. Signed-in users can post messages.
Club membership and admin access use separate passcodes.

## Local setup

Install the dependencies with `npm install`. In `.env` and `.dev.vars`, set
the following values for this application's separate database and secrets:

- `DATABASE_URL`: the Neon PostgreSQL connection string.
- `SESSION_SECRET`: a random session-signing secret with at least 32 bytes of entropy.
- `CLUB_PASSCODE`: the club passcode.
- `ADMIN_PASSCODE`: a distinct admin passcode.

Keep these files private and do not commit them. Use the same values in both
files for local Node and Workers development.

For a **new, empty database schema only**, run `node --env-file=.env scripts/setup-db.js`.
The script creates the user, message, and session tables
and enables pgcrypto. It refuses to initialize a schema where an application
table already exists. The old `db/populatedb.js` is for the original schema and
must not be used for this application.

Start Node with `npm run dev` or the local Workers runtime with
`npm run dev:worker`. Run the automated tests with `node --env-file=.env --test`.

## Deployment

Configure the four values above as secrets on the `message-board-auth` Worker,
then deploy with Wrangler. The Worker build compiles the EJS views automatically.
The Cloudflare Workers Free plan has a 10 ms CPU limit per request; measured
database-backed operations have sometimes exceeded it, so live reliability
under that plan still needs monitoring.
