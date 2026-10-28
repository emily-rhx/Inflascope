# Inflascope

A Next.js creator-discovery marketplace backed by PostgreSQL.

## Local setup

1. Install dependencies with `npm ci`.
2. Copy the required values into `.env.local`.
3. Start PostgreSQL and run `npm run dev`.
4. Open `http://127.0.0.1:3000`.

Local environment files, runtime binaries, database files and build output are intentionally excluded from Git.

## Production account portal

Deploy this Next.js application to Vercel at `account.inflascope.co.uk`. Configure these Production and Preview environment variables in Vercel:

- `DATABASE_URL`: the pooled Neon PostgreSQL connection string.
- `NEXT_PUBLIC_APP_URL`: `https://account.inflascope.co.uk`.
- `RESEND_API_KEY`: the Resend API key created for Inflascope.
- `EMAIL_FROM`: a verified sender such as `Inflascope <accounts@inflascope.co.uk>`.

The signup flow creates a secure account session, stores a hashed 24-hour verification token and sends an Inflascope verification link through Resend. Users do not need a ChatGPT account.

Before the first production deployment, run `drizzle/0000_initial_schema.sql` in the Neon SQL Editor. Stripe and object-storage variables can remain unset until those features are enabled.
