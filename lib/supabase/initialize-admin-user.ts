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

import { createClient } from "@supabase/supabase-js";
import { SupabaseClient } from "@supabase/supabase-js";
import { resolveAdminEmail, resolveAdminPassword } from "@/lib/auth/admin-password";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SECRET_KEY;

let adminAuthClient: SupabaseClient | null = null;

if (supabaseUrl && supabaseServiceRoleKey) {
  adminAuthClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
} else {
  console.warn(
    "Supabase URL or Service Role Key is not set. Admin user creation will be skipped."
  );
}

const findUserIdByEmail = async (
  client: SupabaseClient,
  email: string
): Promise<string | null> => {
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < perPage) return null;
  }
};

const createAdminUserIfNotExists = async () => {
  if (!adminAuthClient) {
    return;
  }

  // The admin account is always created, so nobody can sign up with the admin
  // email and inherit admin rights. Without a strong ADMIN_PASSWORD it gets a
  // random password and stays locked until one is set.
  const adminEmail = resolveAdminEmail(process.env.ADMIN_EMAIL);
  const { password: adminPassword, source } = resolveAdminPassword(
    process.env.ADMIN_PASSWORD
  );

  if (source !== "env") {
    console.error(
      (source === "missing"
        ? "ADMIN_PASSWORD is not set."
        : "ADMIN_PASSWORD is too weak (must be at least 8 characters and not a well-known password).") +
        ` The admin account ${adminEmail} is locked with a random password. ` +
        "Set a strong ADMIN_PASSWORD and restart to sign in as admin."
    );
  }

  const { data: adminUserExists, error: rpcError } = await adminAuthClient.rpc(
    "check_user_exists",
    { user_email: adminEmail }
  );

  if (rpcError) {
    const errorMessage = rpcError.message || "Unknown error";
    const errorCode = rpcError.code || "Unknown code";
    const errorDetails = rpcError.details || "";

    if (
      errorMessage.includes("invalid response") ||
      errorMessage.includes("fetch failed") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ENOTFOUND")
    ) {
      console.warn(
        "⚠️  Admin user initialization skipped: Unable to connect to Supabase.",
        "This may be due to network issues or Supabase service being unavailable.",
        "The app will continue to run, but admin user initialization will be retried on next server restart."
      );
    } else {
      console.error(
        "❌ Error checking for admin user:",
        `${errorMessage} (Code: ${errorCode}${errorDetails ? `, Details: ${errorDetails}` : ""})`
      );
    }
    return;
  }

  if (adminUserExists) {
    // Rotate on every start, so a deployment still on the old hardcoded
    // "123456" password picks up ADMIN_PASSWORD (or is locked) after upgrading.
    try {
      const adminUserId = await findUserIdByEmail(adminAuthClient, adminEmail);
      if (!adminUserId) {
        console.error(
          `❌ Admin user ${adminEmail} exists but could not be found to update its password.`
        );
        return;
      }
      const { error: updateError } =
        await adminAuthClient.auth.admin.updateUserById(adminUserId, {
          password: adminPassword,
        });
      if (updateError) {
        console.error("❌ Error updating admin password:", updateError.message);
        return;
      }
      console.log(
        source === "env"
          ? `Admin user ${adminEmail} password set from ADMIN_PASSWORD.`
          : `Admin user ${adminEmail} locked with a random password.`
      );
    } catch (error) {
      console.error(
        "❌ Error looking up admin user:",
        error instanceof Error ? error.message : error
      );
    }
    return;
  }

  console.log(
    `Admin user not found. Creating user with email ${adminEmail}...`
  );
  const { data, error: createError } =
    await adminAuthClient.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

  if (createError) {
    console.error("Error creating admin user:", createError.message);
    return;
  }

  if (data.user) {
    console.log(`Admin user with email ${adminEmail} created successfully.`);
  }
};

createAdminUserIfNotExists();