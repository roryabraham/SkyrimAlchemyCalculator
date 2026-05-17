import type { Dispatch, SetStateAction } from "react";
import type { AlchemyFormParams } from "../types.ts";
import { defaultAlchemyFormParams } from "../types.ts";

type Props = {
  params: AlchemyFormParams;
  setParams: Dispatch<SetStateAction<AlchemyFormParams>>;
};

function setNumParam(
  setParams: Props["setParams"],
  key:
    | "alchemySkill"
    | "fortifyAlchemy"
    | "alchemistPercent"
    | "seekerOfShadowsPercent",
  value: string,
  fallback: number,
  opts?: { min?: number; max?: number },
) {
  let n = Math.floor(Number(value));
  if (!Number.isFinite(n)) n = fallback;
  if (opts?.min !== undefined) n = Math.max(opts.min, n);
  if (opts?.max !== undefined) n = Math.min(opts.max, n);
  setParams((p) => ({ ...p, [key]: n }));
}

export function AlchemySettingsPanel({ params, setParams }: Props) {
  return (
    <section className="panel">
      <h2>Alchemy settings</h2>
      <p className="muted small">
        Used for gold estimates (UESP PowerFactor). Matches API defaults until
        you change them.
      </p>
      <div className="params-grid">
        <label className="field">
          <span className="field-label">Alchemy skill</span>
          <input
            className="input"
            type="number"
            min={0}
            max={100}
            value={params.alchemySkill}
            onChange={(e) =>
              setNumParam(
                setParams,
                "alchemySkill",
                e.target.value,
                defaultAlchemyFormParams.alchemySkill,
                { min: 0, max: 100 },
              )
            }
          />
        </label>
        <label className="field">
          <span className="field-label">Fortify Alchemy (%)</span>
          <input
            className="input"
            type="number"
            min={0}
            max={500}
            value={params.fortifyAlchemy}
            onChange={(e) =>
              setNumParam(
                setParams,
                "fortifyAlchemy",
                e.target.value,
                defaultAlchemyFormParams.fortifyAlchemy,
                { min: 0, max: 500 },
              )
            }
          />
        </label>
        <label className="field">
          <span className="field-label">Alchemist perk (%)</span>
          <input
            className="input"
            type="number"
            min={0}
            max={100}
            value={params.alchemistPercent}
            onChange={(e) =>
              setNumParam(
                setParams,
                "alchemistPercent",
                e.target.value,
                defaultAlchemyFormParams.alchemistPercent,
                { min: 0, max: 100 },
              )
            }
          />
        </label>
        <label className="field">
          <span className="field-label">Seeker of Shadows (%)</span>
          <input
            className="input"
            type="number"
            min={0}
            max={20}
            value={params.seekerOfShadowsPercent}
            onChange={(e) =>
              setNumParam(
                setParams,
                "seekerOfShadowsPercent",
                e.target.value,
                defaultAlchemyFormParams.seekerOfShadowsPercent,
                { min: 0, max: 20 },
              )
            }
          />
        </label>
      </div>
      <div className="params-checks">
        <label className="check">
          <input
            type="checkbox"
            checked={params.hasPhysician}
            onChange={(e) =>
              setParams((p) => ({ ...p, hasPhysician: e.target.checked }))
            }
          />
          <span>Physician</span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={params.hasBenefactor}
            onChange={(e) =>
              setParams((p) => ({ ...p, hasBenefactor: e.target.checked }))
            }
          />
          <span>Benefactor</span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={params.hasPoisoner}
            onChange={(e) =>
              setParams((p) => ({ ...p, hasPoisoner: e.target.checked }))
            }
          />
          <span>Poisoner</span>
        </label>
      </div>
      <button
        type="button"
        className="btn btn-small"
        onClick={() => setParams({ ...defaultAlchemyFormParams })}
      >
        Reset to defaults
      </button>
    </section>
  );
}
