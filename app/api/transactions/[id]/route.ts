/**
 * Copyright 2025 Circle Internet Group, Inc.  All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdminClient } from "@/lib/supabase/admin-client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", id)
      .single();

    if (txError) {
      if (txError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Transaction not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch transaction", details: txError.message },
        { status: 500 }
      );
    }

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    const { data: statusEvents, error: eventsError } = await supabase
      .from("transaction_events")
      .select("*")
      .eq("transaction_id", id)
      .order("created_at", { ascending: true });

    if (eventsError) {
      console.error("Failed to fetch transaction events:", eventsError);
    }

    const response = {
      id: transaction.id,
      credits: transaction.credit_amount,
      usdcAmount: transaction.amount_usdc,
      txHash: transaction.tx_hash,
      chainId: parseInt(transaction.chain),
      status: transaction.status,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at,
      fee: transaction.fee_usdc,
      walletId: transaction.wallet_id,
      userId: transaction.user_id,
      direction: transaction.direction,
      asset: transaction.asset,
      exchangeRate: transaction.exchange_rate,
      metadata: transaction.metadata,
      idempotencyKey: transaction.idempotency_key,
      statusEvents: statusEvents || [],
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Transaction API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Server error", details: message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { status, txHash, blockNumber, blockHash } = body || {};

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid transaction ID" },
        { status: 400 }
      );
    }

    if (status !== "complete") {
      return NextResponse.json(
        { error: "Only 'complete' status updates are allowed from client" },
        { status: 400 }
      );
    }

    if (typeof txHash !== "string" || !txHash.startsWith("0x")) {
      return NextResponse.json(
        { error: "Valid txHash is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: transaction, error: fetchError } = await supabaseAdminClient
      .from("transactions")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    if (transaction.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (transaction.tx_hash !== txHash) {
      return NextResponse.json(
        { error: "Transaction hash mismatch" },
        { status: 400 }
      );
    }

    // Never override Circle's authoritative status.
    if (transaction.status !== "pending") {
      return NextResponse.json(
        {
          ok: true,
          message: `Transaction already in '${transaction.status}' status, no update needed`,
          transaction: {
            id: transaction.id,
            status: transaction.status,
            updatedAt: transaction.updated_at,
          },
        },
        { status: 200 }
      );
    }

    const metadata = {
      ...(transaction.metadata || {}),
      metamask_confirmation: {
        confirmed_at: new Date().toISOString(),
        block_number: blockNumber,
        block_hash: blockHash,
      },
    };

    if (transaction.direction === "credit" && transaction.credit_amount && transaction.user_id) {
      console.log(`Transaction ${transaction.id} completed. Crediting user ${transaction.user_id} with ${transaction.credit_amount} credits.`);

      const { error: creditsError } = await supabaseAdminClient.rpc("increment_credits", {
        user_id_to_update: transaction.user_id,
        amount_to_add: transaction.credit_amount,
      });

      if (creditsError) {
        console.error(`CRITICAL: Failed to increment credits for user ${transaction.user_id} on transaction ${transaction.id}. Error:`, creditsError);
      } else {
        console.log(`Successfully credited user ${transaction.user_id}.`);
      }
    }

    const { data: updatedTransaction, error: updateError } =
      await supabaseAdminClient
        .from("transactions")
        .update({
          status: "complete",
          metadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

    if (updateError) {
      console.error("[transactions/PATCH] Update error:", updateError);
      return NextResponse.json(
        { error: "Update failed", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Transaction status updated to complete",
        transaction: {
          id: updatedTransaction.id,
          status: updatedTransaction.status,
          credits: Number(updatedTransaction.credit_amount),
          usdcAmount: Number(updatedTransaction.amount_usdc),
          txHash: updatedTransaction.tx_hash,
          chainId: Number(updatedTransaction.chain),
          updatedAt: updatedTransaction.updated_at,
          metadata: updatedTransaction.metadata,
        },
      },
      { status: 200 }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[transactions/PATCH] Server error:", e);
    return NextResponse.json(
      { error: "Server error", details: message },
      { status: 500 }
    );
  }
}
