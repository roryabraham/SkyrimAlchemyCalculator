/** Parsed effect on one ingredient slot (order 1–4). */
export type ParsedEffect = {
  /** Wiki page title without namespace, e.g. Weakness_to_Frost */
  effectKey: string;
  /** Human label from wiki link text */
  displayName: string;
  /** Raw href for traceability */
  href: string | undefined;
  /** Multipliers parsed from UESP parenthetical notation (order: mag, dur, gold/value when present). */
  magMult: number | null;
  durMult: number | null;
  goldMult: number | null;
};

export type ParsedIngredient = {
  rowId: string;
  name: string;
  nameNormalized: string;
  formIdRaw: string;
  descriptionText: string;
  effects: ParsedEffect[];
  value: number | null;
  weight: number | null;
  merchantAvail: string;
  garden: string;
  /** Standard vs Creation Club table on UESP */
  section: "standard" | "creation_club";
};
