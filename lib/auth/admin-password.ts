/**
 * Copyright 2026 Circle Internet Group, Inc.  All rights reserved.
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

import { randomBytes } from "node:crypto";

// The database RLS policies and credit functions key off this address.
const DEFAULT_ADMIN_EMAIL = "admin@admin.com";

// Passwords that must never guard a privileged account, even if set explicitly.
const COMMON_WEAK_PASSWORDS = new Set([
  "123456",
  "12345678",
  "123456789",
  "password",
  "admin",
  "admin123",
  "qwerty",
  "letmein",
  "changeme",
  "welcome",
]);

export const isWeakPassword = (password: string): boolean => {
  const trimmed = password.trim();
  return trimmed.length < 8 || COMMON_WEAK_PASSWORDS.has(trimmed.toLowerCase());
};

export type AdminPassword = {
  password: string;
  source: "env" | "missing" | "weak";
};

/**
 * A strong ADMIN_PASSWORD is used as given. Otherwise the admin account still
 * gets a random password nobody knows: leaving it unprovisioned would let
 * anyone sign up with the admin email and inherit admin rights.
 */
export const resolveAdminPassword = (
  envValue: string | undefined
): AdminPassword => {
  if (envValue && !isWeakPassword(envValue)) {
    return { password: envValue, source: "env" };
  }
  return {
    password: randomBytes(32).toString("base64url"),
    source: envValue ? "weak" : "missing",
  };
};

export const resolveAdminEmail = (envValue: string | undefined): string =>
  envValue?.trim().toLowerCase() || DEFAULT_ADMIN_EMAIL;
