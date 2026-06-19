#!/usr/bin/env node
/**
 * Compare character_photos rows against storage.objects in the assets bucket.
 *
 * Usage:
 *   npm run db:audit-character-photos
 *
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - migration 035_character_photo_integrity_audit.sql applied
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function formatReport(report) {
  const lines = [
    `Character photo integrity audit (${report.checkedAt})`,
    `DB rows: ${report.totalDbRows} · Storage files: ${report.totalStorageFiles}`,
    "",
  ];

  if (report.missingInStorage.length === 0 && report.orphanInStorage.length === 0) {
    lines.push("OK — all character_photos rows and storage files are in sync.");
    return lines.join("\n");
  }

  if (report.missingInStorage.length > 0) {
    lines.push(`Missing in storage (${report.missingInStorage.length}):`);
    for (const issue of report.missingInStorage) {
      const who = issue.userName?.trim() || issue.userHandle?.trim() || issue.userId.slice(0, 8);
      const slot = issue.slotIndex != null ? `slot ${issue.slotIndex + 1}` : "no slot";
      lines.push(`  - ${who} · ${slot} · ${issue.fileName} · ${issue.filePath} · photo ${issue.photoId}`);
    }
    lines.push("");
  }

  if (report.orphanInStorage.length > 0) {
    lines.push(`Orphan storage files (${report.orphanInStorage.length}):`);
    for (const orphan of report.orphanInStorage) {
      lines.push(`  - ${orphan.filePath} · uploaded ${orphan.createdAt}`);
    }
  }

  return lines.join("\n");
}

function normalizeAuditPayload(payload) {
  return {
    checkedAt: payload?.checkedAt ?? new Date().toISOString(),
    totalDbRows: payload?.totalDbRows ?? 0,
    totalStorageFiles: payload?.totalStorageFiles ?? 0,
    missingInStorage: (payload?.missingInStorage ?? []).map((row) => ({
      photoId: row.photoId ?? "",
      userId: row.userId ?? "",
      filePath: row.filePath ?? "",
      fileName: row.fileName ?? "",
      slotIndex: row.slotIndex ?? null,
      userName: row.userName ?? null,
      userHandle: row.userHandle ?? null,
    })),
    orphanInStorage: (payload?.orphanInStorage ?? []).map((row) => ({
      filePath: row.filePath ?? "",
      createdAt: row.createdAt ?? "",
    })),
  };
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, key);

try {
  const { data, error } = await admin.rpc("audit_character_photo_integrity");

  if (error) {
    const message = error.message.includes("audit_character_photo_integrity")
      ? "Audit function missing. Apply migration 035_character_photo_integrity_audit.sql."
      : error.message;
    throw new Error(message);
  }

  const report = normalizeAuditPayload(data);
  console.log(formatReport(report));
  process.exit(report.missingInStorage.length > 0 || report.orphanInStorage.length > 0 ? 1 : 0);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
