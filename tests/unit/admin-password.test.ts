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

import { describe, expect, it } from "vitest";
import {
  isWeakPassword,
  resolveAdminEmail,
  resolveAdminPassword,
} from "@/lib/auth/admin-password";

describe("isWeakPassword", () => {
  it.each(["123456", "short", "Password", "        ", "  admin123  "])(
    "treats %j as weak",
    (password) => {
      expect(isWeakPassword(password)).toBe(true);
    }
  );

  it("accepts a long, uncommon password", () => {
    expect(isWeakPassword("correct-horse-battery-staple")).toBe(false);
  });
});

describe("resolveAdminPassword", () => {
  it("uses a strong ADMIN_PASSWORD as given", () => {
    expect(resolveAdminPassword("correct-horse-battery-staple")).toEqual({
      password: "correct-horse-battery-staple",
      source: "env",
    });
  });

  it.each([undefined, "", "123456"])(
    "falls back to a random lock password when ADMIN_PASSWORD is %j",
    (value) => {
      const first = resolveAdminPassword(value);
      const second = resolveAdminPassword(value);
      expect(first.source).toBe(value ? "weak" : "missing");
      expect(first.password).not.toBe(value);
      expect(first.password.length).toBeGreaterThanOrEqual(32);
      expect(first.password).not.toBe(second.password);
    }
  );
});

describe("resolveAdminEmail", () => {
  it("defaults to admin@admin.com when ADMIN_EMAIL is unset or blank", () => {
    expect(resolveAdminEmail(undefined)).toBe("admin@admin.com");
    expect(resolveAdminEmail("   ")).toBe("admin@admin.com");
  });

  it("trims and lowercases a configured ADMIN_EMAIL", () => {
    expect(resolveAdminEmail(" Ops@Example.com ")).toBe("ops@example.com");
  });
});
