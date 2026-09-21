# Arc Commerce

Integrate USDC as a payment method for purchasing credits on Arc. This sample application uses Next.js, Supabase, and Circle Developer Controlled Wallets to demonstrate a credit purchase flow with USDC payments on Arc testnet.

<img width="830" height="646" alt="User dashboard for credit purchase" src="public/screenshot.png" />

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Deploying with a Hosted Supabase Project](#deploying-with-a-hosted-supabase-project)
- [Upgrading](#upgrading)
- [How It Works](#how-it-works)
- [Environment Variables](#environment-variables)
- [User Accounts](#user-accounts)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Security & Usage Model](#security--usage-model)

## Features

The dashboard (`/dashboard`) shows a different view for regular users and the admin:

- **Sign up and log in** (`/auth/sign-up`, `/auth/login`) — Email and password accounts backed by Supabase Auth, with password reset.
- **Purchase credits** (`PurchaseCreditsCard`) — Connect a browser wallet and pay for credits with USDC on Arc Testnet and other supported testnets.
- **Purchase history** (`TransactionHistory`) — Your credit purchases with date, status, and network filters. Updates in real time.
- **Transaction details** (`/dashboard/[txHash]`) — Status, amounts, and explorer link for a single purchase.
- **Admin wallets** (`AdminWalletsTable`) — Create Developer-Controlled Wallets, check balances, enable, disable, or archive them, and move USDC between wallets on the same chain or across chains.
- **Admin transactions** (`AdminTransactionsTable`) — Every admin transfer and incoming user payment, updated in real time.

## Prerequisites

- **Node.js v22+** — Install via [nvm](https://github.com/nvm-sh/nvm) (`nvm use` will read the `.nvmrc` file)
- **Docker Desktop** — required to run Supabase locally. [Install Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **[ngrok](https://ngrok.com/)** — for local webhook testing
- Circle Developer Controlled Wallets **[API key](https://console.circle.com/signin)** and **[Entity Secret](https://developers.circle.com/wallets/dev-controlled/register-entity-secret)**

## Getting Started

1. Clone the repository and install dependencies:

   ```bash
   git clone git@github.com:akelani-circle/arc-commerce.git
   cd arc-commerce
   npm install
   ```

2. Start the local Supabase instance (requires Docker Desktop running):

   ```bash
   npm run db:start
   ```

   This starts Supabase in Docker and applies the migrations in `supabase/migrations`. The output shows the Supabase URL and API keys needed in the next step. Run `npm run db:status` to see them again.

3. Set up environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Then edit `.env.local` and fill in all required values. Use the Supabase URL and keys from the previous step's output (see [Environment Variables](#environment-variables) section below).

4. Start the development server:

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`. The admin wallet is automatically created on first startup.

5. Set up Circle Webhooks (for local development):

   In a separate terminal, expose your local server:

   ```bash
   ngrok http 3000
   ```

   Copy the HTTPS URL from ngrok (e.g., `https://your-ngrok-url.ngrok.io`) and add it to your Circle Console webhooks section:
   - Navigate to Circle Console → Webhooks
   - Add a new webhook endpoint: `https://your-ngrok-url.ngrok.io/api/circle/webhook`
   - Keep ngrok running while developing to receive webhook events

## Deploying with a Hosted Supabase Project

Local Supabase is used for development. To run against a hosted [Supabase](https://supabase.com/) project (for example when deploying to Vercel):

1. Create a project, then link it and apply the migrations:

   ```bash
   npm run supabase -- link --project-ref <your-project-ref>
   npm run supabase -- db push
   ```

2. Copy the project URL, publishable key and secret key from **Settings → API** into your deployment's environment variables (see [Environment Variables](#environment-variables)).
3. Use real email addresses when signing up: hosted projects send real emails, and disposable domains may fail verification.

Always run `db push` when you deploy a new version: some security rules live in migrations (see below), not in application code.

## Upgrading

Changes that require action on an existing deployment:

- **Rename** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The old name is no longer read, so the app fails to talk to Supabase until it is renamed.
- **Remove** `CIRCLE_USDC_TOKEN_ID`. It is no longer used.
- **Apply the new migrations** (`npm run db:start` locally, `db push` on hosted). They:
  - add `settle_user_transaction()`, which changes a purchase's status and grants its credits atomically, exactly once;
  - restrict `transactions` reads to the owner (the admin still sees everything). Previously any signed-in user could read every transaction;
  - revoke direct execution of `increment_credits`, `check_user_exists` and friends from browser roles;
  - reject transaction hashes that differ only by letter case.
- **`/api/wallet` and `/api/wallet-set` were removed.** They had no authentication and no callers outside the server, which now creates wallets directly.
- Credit purchases are priced at **1 USDC per credit** (`lib/payments/credits.ts`), matching the UI. The server previously stored a stale `0.01` exchange rate.

## How It Works

- Built with [Next.js](https://nextjs.org/) and [Supabase](https://supabase.com/)
- Uses [Circle Developer Controlled Wallets](https://developers.circle.com/wallets/dev-controlled) for USDC transactions
- Wallet operations handled server-side with `@circle-fin/developer-controlled-wallets`
- Admin transfers use `@circle-fin/app-kit` with the Circle Wallets adapter: `kit.send` for same-chain transfers and `kit.bridge` for cross-chain transfers
- User payments are sent from the browser with [wagmi](https://wagmi.sh/) and [viem](https://viem.sh/)
- Webhook signature verification ensures secure transaction notifications
- Credits are granted only after a purchase is verified: the server reads the transaction receipt itself and checks the sender, the receiving admin wallet and the USDC amount. Nothing the browser reports is trusted
- Admin server actions and API routes check that the caller is the admin (`ADMIN_EMAIL`) on every request
- Admin wallet automatically initialized on first run

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

# Circle
CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=
CIRCLE_BLOCKCHAIN=ARC-TESTNET

# Misc
ADMIN_EMAIL=admin@admin.com
```

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Local Supabase API URL (from `npm run db:status`). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Local Supabase publishable key (from `npm run db:status`). |
| `SUPABASE_SECRET_KEY` | Server-side | Local Supabase secret key for privileged writes, e.g. transaction inserts (from `npm run db:status`). |
| `CIRCLE_API_KEY` | Server-side | Circle API key for wallet operations and webhook signature verification. |
| `CIRCLE_ENTITY_SECRET` | Server-side | Circle entity secret for wallet operations. |
| `CIRCLE_BLOCKCHAIN` | Server-side | Default blockchain for new wallets (e.g., `ARC-TESTNET`). |
| `ADMIN_EMAIL` | Server-side | Admin user email address. |
| `VERCEL_URL` | Server-side | Optional. Set automatically on Vercel. Used as the app's base URL for metadata; defaults to `http://localhost:3000`. |

## User Accounts

### Admin Account

On first startup, an admin user is automatically created with the following credentials:

- **Email:** `admin@admin.com`
- **Password:** `123456`

The admin account has access to the **Admin Dashboard**, which provides an overview of all users, wallets, and transactions in the system.

Regular users who sign up will see the **User Dashboard**, which allows them to purchase credits with USDC and view their own transaction history.

### Signup Rate Limits

Supabase limits email signups to **2 per hour** by default. Emails are not actually sent. Open the local mail server at [http://127.0.0.1:54324](http://127.0.0.1:54324) to confirm signups. If you hit an "email rate limit exceeded" error during testing, raise `email_sent` under `[auth.rate_limit]` in `supabase/config.toml`, then restart with `npm run db:stop` and `npm run db:start`.

## Available Scripts

- `npm run dev` — Start the Next.js development server with Turbopack
- `npm run build` — Create a production build
- `npm run start` — Start the production server
- `npm run lint` — Run ESLint
- `npm test` — Run the unit tests (no services needed)
- `npm run test:integration` — Run database tests against the local Supabase (`npm run db:start` first)
- `npm run db:start` — Start the local Supabase instance and apply migrations
- `npm run db:stop` — Stop the local Supabase instance
- `npm run db:status` — Show local Supabase URLs and API keys
- `npm run db:reset` — Recreate the local database and re-run all migrations
- `npm run db:migration <name>` — Create a new migration file in `supabase/migrations`
- `npm run supabase -- <command>` — Run any other Supabase CLI command

## Testing

- `npm test` runs the unit tests in `tests/unit`. They mock Supabase, Circle and the chain, so they need no credentials or Docker.
- `npm run test:integration` runs `tests/integration` against the **local** Supabase stack. They cover the parts mocks cannot prove: row-level security, function permissions, and that concurrent webhook and wallet confirmations credit a purchase only once. They create and delete their own users; they read connection settings from `.env.local`.

## Security & Usage Model

This sample application:
- Assumes testnet usage only
- Handles secrets via environment variables
- Verifies webhook signatures for security
- Is not intended for production use without modification

Known limitations to address before any production use:
- **Wallet ownership is not proven.** A purchase is verified against the wallet address the browser reports. Someone who sees another person's USDC payment to the admin wallet on-chain could record it against their own account before its sender does. Production code should bind a wallet to a user with a signed message (for example SIWE) and require the transfer to come from that wallet.
- **Default admin credentials** (`admin@admin.com` / `123456`) are for local development. Change them, and note that the admin identity is also written into the database migrations.
- **Public RPC endpoints** are used for balance reads and purchase verification. Use a dedicated provider for reliability.

See `SECURITY.md` for vulnerability reporting guidelines. Please report issues privately via Circle's bug bounty program.
