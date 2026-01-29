# Arc Commerce

This project demonstrates how to integrate USDC as a payment method for purchasing credits on Arc.

## Table of Contents

- [Clone and Run Locally](#clone-and-run-locally)
- [Environment Variables](#environment-variables)

## Clone and Run Locally

1. **Clone and install dependencies:**

   ```bash
   git clone git@github.com:circlefin/arc-commerce.git
   cd arc-commerce
   npm install
   ```

2. **Start Supabase locally** (requires Docker):

   ```bash
   npx supabase start
   npx supabase migration up
   ```

   The output of `npx supabase start` will display the Supabase URL and API keys needed in the next step.

3. **Set up environment variables:**

   ```bash
   cp .env.example .env.local
   ```

   Then edit `.env.local` and fill in all required values. Use the Supabase URL and keys from the previous step's output (see [Environment Variables](#environment-variables) section below).

4. **Start the development server:**

   ```bash
   npm run dev
   ```

   The app will be available at [http://localhost:3000](http://localhost:3000/). The admin wallet will be automatically created on first startup.

5. **Set up Circle Webhooks:**

   In a separate terminal, start ngrok to expose your local server:

   ```bash
   ngrok http 3000
   ```

   Copy the HTTPS URL from ngrok (e.g., `https://your-ngrok-url.ngrok.io`) and add it to your Circle Console webhooks section:
   - Navigate to Circle Console → Webhooks
   - Add a new webhook endpoint: `https://your-ngrok-url.ngrok.io/api/circle/webhook`
   - Keep ngrok running while developing to receive webhook events

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=
SUPABASE_SECRET_KEY=

# Circle
CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=
CIRCLE_BLOCKCHAIN=ARC-TESTNET
CIRCLE_USDC_TOKEN_ID=

# Misc
ADMIN_EMAIL=admin@admin.com
```

| Variable                              | Scope       | Purpose                                                                  |
| ------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`            | Public      | Supabase project URL.                                                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` | Public | Supabase anonymous/public key.                                           |
| `SUPABASE_SECRET_KEY`           | Server-side | Secret key for privileged writes (e.g., transaction inserts).                  |
| `CIRCLE_API_KEY`                      | Server-side | Used to fetch Circle webhook public keys for signature verification.     |
| `CIRCLE_ENTITY_SECRET`                | Server-side | Circle entity secret for wallet operations.                              |
| `CIRCLE_BLOCKCHAIN`                   | Server-side | Blockchain network identifier (e.g., "ARC-TESTNET").                     |
| `CIRCLE_USDC_TOKEN_ID`                | Server-side | USDC token ID for the specified blockchain. Pre-filled for ARC-TESTNET.  |
| `ADMIN_EMAIL`                         | Server-side | Admin user email address.                                                |