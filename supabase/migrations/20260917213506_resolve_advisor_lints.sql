-- Copyright 2025 Circle Internet Group, Inc.  All rights reserved.
--
-- Licensed under the Apache License, Version 2.0 (the "License");
-- you may not use this file except in compliance with the License.
-- You may obtain a copy of the License at
--
--     http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing, software
-- distributed under the License is distributed on an "AS IS" BASIS,
-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
-- See the License for the specific language governing permissions and
-- limitations under the License.
--
-- SPDX-License-Identifier: Apache-2.0

-- Migration: Resolve every Supabase Advisor finding reported by the Studio
-- security and performance linters.
--
-- Findings addressed here:
--   0001 unindexed_foreign_keys .......... public.transaction_events.transaction_id
--   0003 auth_rls_initplan ............... public.admin_wallets, public.credits (x2)
--   0005 unused_index .................... 4 indexes with no supporting query pattern
--   0028 anon_security_definer_function_executable ...... 3 functions
--   0029 authenticated_security_definer_function_executable ... 3 functions


-- ===========================================================================
-- 1. Unindexed foreign key (0001)
-- ===========================================================================
-- `transaction_events.transaction_id` is a cascading foreign key that is also
-- read by the audit-trail RLS policy. Without a covering index every parent
-- delete and every policy check degrades into a sequential scan.

CREATE INDEX IF NOT EXISTS idx_transaction_events_transaction_id
ON public.transaction_events(transaction_id);


-- ===========================================================================
-- 2. Auth RLS initialisation plan (0003)
-- ===========================================================================
-- `auth.role()` / `auth.uid()` were called bare, so Postgres re-evaluated them
-- once per row. Wrapping them in a scalar sub-select turns them into an
-- InitPlan that is evaluated a single time per statement. The `TO` clauses make
-- the intended audience explicit and keep the policies from being evaluated for
-- roles that can never satisfy them.

DROP POLICY IF EXISTS "Allow full access for service role" ON public.admin_wallets;

CREATE POLICY "Allow full access for service role"
ON public.admin_wallets
FOR ALL
TO service_role
USING ( (select auth.role()) = 'service_role' )
WITH CHECK ( (select auth.role()) = 'service_role' );

DROP POLICY IF EXISTS "Users can view their own credits" ON public.credits;

CREATE POLICY "Users can view their own credits"
ON public.credits
FOR SELECT
TO authenticated
USING ( (select auth.uid()) = user_id );

DROP POLICY IF EXISTS "Users can insert their own credit record" ON public.credits;

CREATE POLICY "Users can insert their own credit record"
ON public.credits
FOR INSERT
TO authenticated
WITH CHECK ( (select auth.uid()) = user_id );


-- ===========================================================================
-- 3. Unused indexes (0005)
-- ===========================================================================
-- Dropped because no query in the application reaches for them:
--   * idx_transactions_status          - status is filtered client side in the
--                                        transaction tables, never in SQL, and a
--                                        five-value enum is a poor index target.
--   * idx_transactions_missing_tx_hash - a diagnostic aid for a one-off backfill;
--                                        nothing queries it.
--   * idx_twe_circle_transaction_id    - webhook dedupe goes through the unique
--                                        `dedupe_hash` / `circle_event_id`
--                                        constraints, not this column.
--   * idx_twe_received_at              - webhook events are always ordered inside
--                                        a single `transaction_id` batch, which
--                                        idx_twe_transaction_id already serves.
--
-- The remaining indexes flagged as unused are kept on purpose:
-- idx_transactions_user_id, idx_transactions_source_wallet_id and
-- idx_twe_transaction_id are the covering indexes for foreign keys (dropping
-- them just trades this hint for an unindexed-foreign-key one), and
-- idx_transactions_created_at backs the `order by created_at desc` used by every
-- transaction listing.

DROP INDEX IF EXISTS public.idx_transactions_status;
DROP INDEX IF EXISTS public.idx_transactions_missing_tx_hash;
DROP INDEX IF EXISTS public.idx_twe_circle_transaction_id;
DROP INDEX IF EXISTS public.idx_twe_received_at;


-- ===========================================================================
-- 4. SECURITY DEFINER functions exposed over the API (0028, 0029)
-- ===========================================================================
-- Postgres grants EXECUTE to PUBLIC on every new function, so all three
-- SECURITY DEFINER functions were reachable at /rest/v1/rpc/... by the `anon`
-- and `authenticated` roles. All three are server-side only:
--   * check_user_exists      - called by lib/supabase/initialize-admin-user.ts
--   * increment_credits      - called by the Circle webhook and transaction routes
--   * handle_new_user_credits - a trigger body on auth.users, never an RPC
-- Revoke the blanket PUBLIC grant and hand EXECUTE back only to the roles that
-- genuinely need it.

REVOKE ALL ON FUNCTION public.check_user_exists(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_exists(text) TO service_role;

REVOKE ALL ON FUNCTION public.increment_credits(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_credits(uuid, numeric) TO service_role;

-- The trigger on auth.users runs as supabase_auth_admin, so that role keeps its
-- EXECUTE grant. Nothing else needs to call this function.
REVOKE ALL ON FUNCTION public.handle_new_user_credits() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user_credits() TO supabase_auth_admin;
