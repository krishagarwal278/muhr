import type { SupabaseClient } from "@supabase/supabase-js";

export interface CharacterPhotoIntegrityIssue {
  photoId: string;
  userId: string;
  filePath: string;
  fileName: string;
  slotIndex: number | null;
  userName: string | null;
  userHandle: string | null;
}

export interface StorageOrphanCharacterPhoto {
  filePath: string;
  createdAt: string;
}

export interface CharacterPhotoIntegrityReport {
  checkedAt: string;
  totalDbRows: number;
  totalStorageFiles: number;
  missingInStorage: CharacterPhotoIntegrityIssue[];
  orphanInStorage: StorageOrphanCharacterPhoto[];
}

type RpcAuditPayload = {
  checkedAt?: string;
  totalDbRows?: number;
  totalStorageFiles?: number;
  missingInStorage?: Array<{
    photoId?: string;
    userId?: string;
    filePath?: string;
    fileName?: string;
    slotIndex?: number | null;
    userName?: string | null;
    userHandle?: string | null;
  }> | null;
  orphanInStorage?: Array<{
    filePath?: string;
    createdAt?: string;
  }> | null;
};

/** DB rows whose `file_path` has no matching object in the assets bucket. */
export async function auditCharacterPhotoIntegrity(
  admin: SupabaseClient
): Promise<CharacterPhotoIntegrityReport> {
  const { data, error } = await admin.rpc("audit_character_photo_integrity");

  if (error) {
    throw new Error(
      error.message.includes("audit_character_photo_integrity")
        ? "Audit function missing. Apply migration 035_character_photo_integrity_audit.sql."
        : `Audit failed: ${error.message}`
    );
  }

  return normalizeAuditPayload(data as RpcAuditPayload | null);
}

function normalizeAuditPayload(payload: RpcAuditPayload | null): CharacterPhotoIntegrityReport {
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

export function formatCharacterPhotoIntegrityReport(report: CharacterPhotoIntegrityReport): string {
  const lines: string[] = [
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
      const who =
        issue.userName?.trim() ||
        issue.userHandle?.trim() ||
        issue.userId.slice(0, 8);
      const slot =
        issue.slotIndex != null ? `slot ${issue.slotIndex + 1}` : "no slot";
      lines.push(
        `  - ${who} · ${slot} · ${issue.fileName} · ${issue.filePath} · photo ${issue.photoId}`
      );
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
