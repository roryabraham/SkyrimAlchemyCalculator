import type { AlchemyFormParams, InventoryRow } from "./types.ts";
import { defaultAlchemyFormParams } from "./types.ts";
import { uid } from "./uid.ts";

/** DevTools → Application → Local Storage: clear this key to reset saved inventory/settings. */
export const APP_STATE_STORAGE_KEY = "SkyrimAlchemyCalculator.appState";

const SCHEMA_VERSION = 1;

const QTY_MIN = 0;
const QTY_MAX = 99_999;

type PersistedBlob = {
  v: number;
  rows: InventoryRow[];
  params: AlchemyFormParams;
};

function clampInt(value: number, min: number, max: number, fallback: number): number {
  let n = Math.floor(Number(value));
  if (!Number.isFinite(n)) {
    n = fallback;
  }
  return Math.min(max, Math.max(min, n));
}

function parseParams(raw: unknown): AlchemyFormParams {
  const base = { ...defaultAlchemyFormParams };
  if (raw === null || typeof raw !== "object") {
    return base;
  }
  const o = raw as Record<string, unknown>;
  return {
    alchemySkill: clampInt(Number(o.alchemySkill), 0, 100, defaultAlchemyFormParams.alchemySkill),
    fortifyAlchemy: clampInt(
      Number(o.fortifyAlchemy),
      0,
      500,
      defaultAlchemyFormParams.fortifyAlchemy,
    ),
    alchemistPercent: clampInt(
      Number(o.alchemistPercent),
      0,
      100,
      defaultAlchemyFormParams.alchemistPercent,
    ),
    seekerOfShadowsPercent: clampInt(
      Number(o.seekerOfShadowsPercent),
      0,
      20,
      defaultAlchemyFormParams.seekerOfShadowsPercent,
    ),
    hasPhysician: Boolean(o.hasPhysician),
    hasBenefactor: Boolean(o.hasBenefactor),
    hasPoisoner: Boolean(o.hasPoisoner),
  };
}

function parseIngredientIconUrl(raw: unknown): string | null | undefined {
  if (raw === null) {
    return null;
  }
  if (typeof raw === "string") {
    return raw;
  }
  return undefined;
}

function normalizeRow(raw: unknown): InventoryRow | null {
  if (raw === null || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" && o.id.trim() ? o.id : uid();
  const name = typeof o.name === "string" ? o.name : "";
  const quantity = clampInt(Number(o.quantity), QTY_MIN, QTY_MAX, 1);
  const row: InventoryRow = { id, name, quantity };
  if (typeof o.ingredientId === "number" && Number.isFinite(o.ingredientId)) {
    row.ingredientId = Math.floor(o.ingredientId);
  }
  const icon = parseIngredientIconUrl(o.ingredientIconUrl);
  if (icon !== undefined) {
    row.ingredientIconUrl = icon;
  }
  return row;
}

function parseRowsArray(raw: unknown[]): InventoryRow[] {
  const rows: InventoryRow[] = [];
  for (const item of raw) {
    const row = normalizeRow(item);
    if (row) {
      rows.push(row);
    }
  }
  if (rows.length === 0) {
    return [{ id: uid(), name: "", quantity: 1 }];
  }
  return rows;
}

export function readPersistedState(): { rows: InventoryRow[]; params: AlchemyFormParams } | null {
  try {
    const rawJson = localStorage.getItem(APP_STATE_STORAGE_KEY);
    if (rawJson === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(rawJson);
    if (parsed === null || typeof parsed !== "object") {
      return null;
    }
    const o = parsed as Record<string, unknown>;
    if (o.v !== SCHEMA_VERSION) {
      return null;
    }
    if (!("rows" in o) || !("params" in o) || !Array.isArray(o.rows)) {
      return null;
    }
    return {
      rows: parseRowsArray(o.rows),
      params: parseParams(o.params),
    };
  } catch {
    return null;
  }
}

export function writePersistedState(snapshot: {
  rows: InventoryRow[];
  params: AlchemyFormParams;
}): void {
  const blob: PersistedBlob = {
    v: SCHEMA_VERSION,
    rows: snapshot.rows,
    params: snapshot.params,
  };
  try {
    localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(blob));
  } catch {
    // Quota, private mode, or disabled storage — ignore.
  }
}
