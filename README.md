# Arc Commerce

Integrate USDC as a payment method for purchasing credits on Arc. This sample application uses Next.js, Supabase, and Circle Developer Controlled Wallets to demonstrate a credit purchase flow with USDC payments on Arc testnet.

<img width="830" height="646" alt="User dashboard for credit purchase" src="public/screenshot.png" />

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [How It Works](#how-it-works)
- [Environment Variables](#environment-variables)
- [User Accounts](#user-accounts)
- [Available Scripts](#available-scripts)
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

## How It Works

- Built with [Next.js](https://nextjs.org/) and [Supabase](https://supabase.com/)
- Uses [Circle Developer Controlled Wallets](https://developers.circle.com/wallets/dev-controlled) for USDC transactions
- Wallet operations handled server-side with `@circle-fin/developer-controlled-wallets`
- Admin transfers use `@circle-fin/app-kit` with the Circle Wallets adapter: `kit.send` for same-chain transfers and `kit.bridge` for cross-chain transfers
- User payments are sent from the browser with [wagmi](https://wagmi.sh/) and [viem](https://viem.sh/)
- Webhook signature verification ensures secure transaction notifications
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
| `NEXT_PUBLIC_VERCEL_URL` | Public | Optional. Set automatically on Vercel. Used as the base URL for server-side calls to the app's own API; defaults to `http://localhost:3000`. |

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
- `npm run db:start` — Start the local Supabase instance and apply migrations
- `npm run db:stop` — Stop the local Supabase instance
- `npm run db:status` — Show local Supabase URLs and API keys
- `npm run db:reset` — Recreate the local database and re-run all migrations
- `npm run db:migration <name>` — Create a new migration file in `supabase/migrations`
- `npm run supabase -- <command>` — Run any other Supabase CLI command

## Security & Usage Model

This sample application:
- Assumes testnet usage only
- Handles secrets via environment variables
- Verifies webhook signatures for security
- Is not intended for production use without modification

See `SECURITY.md` for vulnerability reporting guidelines. Please report issues privately via Circle's bug bounty program.
