import { useMemo, useState, type ReactElement } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";

import { calculateAttackOutcome } from "@/lib/engine";
import {
  validateAttackForm,
  type AttackFormValues,
} from "@/lib/validation";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const INITIAL_VALUES: AttackFormValues = {
  modelCount: "2",
  rateOfAttack: "4",
  hitTarget: "3",
  damagePerDie: "2",
  precisionX: "0",
  surgeEnabled: false,
  surgeFormula: "d3",
  critX: "0",
  hitsX: "0",
  hitsY: "2",
  armourTarget: "4",
  toughX: "0",
  dodgeX: "0",
  evadeEnabled: false,
  evadeTarget: "6",
};

const CHART_TEXT = "rgba(166,178,199,0.92)";
const CHART_GRID = "rgba(43,54,72,0.58)";
const DISABLED_TINT_PATTERN =
  "repeating-linear-gradient(-45deg, rgba(127, 141, 164, 0.15) 0 6px, rgba(127, 141, 164, 0.04) 6px 12px)";

const CHART_OPTIONS: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: "rgba(9,13,20,0.92)",
      titleColor: "#e7ecf5",
      bodyColor: "#e7ecf5",
      borderColor: "rgba(43,54,72,0.9)",
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      ticks: {
        color: CHART_TEXT,
      },
      grid: {
        color: CHART_GRID,
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
        color: CHART_TEXT,
      },
      grid: {
        color: CHART_GRID,
      },
    },
  },
};

function formatPercent(probability: number): string {
  return `${(probability * 100).toFixed(2)}%`;
}

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function FieldError({ error }: { error?: string }): ReactElement | null {
  if (!error) {
    return null;
  }
  return (
    <p role="alert" style={{ color: "var(--danger)", margin: "0.25rem 0 0", fontSize: "0.85rem" }}>
      {error}
    </p>
  );
}

interface NumberFieldProps {
  label: string;
  name: keyof AttackFormValues;
  value: string;
  onChange: (name: keyof AttackFormValues, value: string) => void;
  min?: number;
  max?: number;
  error?: string;
  disabled?: boolean;
  labelTitle?: string;
  placeholder?: string;
}

function NumberField({
  label,
  name,
  value,
  onChange,
  min,
  max,
  error,
  disabled,
  labelTitle,
  placeholder = "Ex: 2",
}: NumberFieldProps): ReactElement {
  const isDisabled = Boolean(disabled);

  return (
    <label style={{ display: "block", fontSize: "0.94rem", color: "var(--ink-soft)" }}>
      <span
        title={labelTitle}
        style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600, color: "var(--ink)" }}
      >
        {label}
      </span>
      <input
        inputMode="numeric"
        type="number"
        step={1}
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(name, event.currentTarget.value)}
        className={`field-input${isDisabled ? " is-input-disabled" : ""}`}
        style={{
          width: "100%",
          padding: "0.58rem 0.65rem",
          borderRadius: 9,
          border: isDisabled ? "1px solid var(--line-disabled)" : "1px solid var(--line)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.02)",
          font: "inherit",
          color: isDisabled ? "var(--text-disabled)" : "var(--ink)",
          backgroundColor: isDisabled ? "var(--bg-input-disabled)" : "var(--bg-input)",
          backgroundImage: isDisabled ? DISABLED_TINT_PATTERN : "none",
          cursor: isDisabled ? "not-allowed" : "text",
          transition: "border-color 130ms ease, box-shadow 130ms ease",
        }}
      />
      <FieldError error={error} />
    </label>
  );
}

export default function AttackCalculator(): ReactElement {
  const [values, setValues] = useState<AttackFormValues>(INITIAL_VALUES);

  const validation = useMemo(() => validateAttackForm(values), [values]);
  const outcome = useMemo(
    () => (validation.ok && validation.data ? calculateAttackOutcome(validation.data) : null),
    [validation],
  );

  const poolExpectations = useMemo(() => {
    if (!validation.ok || !validation.data || !outcome) {
      return null;
    }

    const attackPoolDice = validation.data.modelCount * validation.data.rateOfAttack;
    const armourPoolDice = Math.max(
      0,
      outcome.expectedHitSuccesses - outcome.expectedBypassDice + validation.data.hitsX,
    );
    const damagePoolDice = outcome.expectedDamagePoolDice;
    const healthInflictDice = outcome.expectedHealthInflictedDice;

    return {
      attackPoolDice,
      armourPoolDice,
      damagePoolDice,
      healthInflictDice,
    };
  }, [validation, outcome]);

  const pmfChartData: ChartData<"bar"> | null = useMemo(() => {
    if (!outcome) {
      return null;
    }

    return {
      labels: outcome.pmf.map((entry) => String(entry.value)),
      datasets: [
        {
          label: "Probability",
          data: outcome.pmf.map((entry) => Number((entry.probability * 100).toFixed(6))),
          backgroundColor: "rgba(91,180,255,0.8)",
          borderRadius: 4,
          barPercentage: 0.95,
          categoryPercentage: 0.95,
        },
      ],
    };
  }, [outcome]);

  const poolChartData: ChartData<"bar"> | null = useMemo(() => {
    if (!poolExpectations) {
      return null;
    }

    const labels = ["Attack Pool", "Armour Pool", "Damage Pool", "Health Inflict"];
    const data = [
      Number(poolExpectations.attackPoolDice.toFixed(6)),
      Number(poolExpectations.armourPoolDice.toFixed(6)),
      Number(poolExpectations.damagePoolDice.toFixed(6)),
      Number(poolExpectations.healthInflictDice.toFixed(6)),
    ];
    const backgroundColor = [
      "rgba(91,180,255,0.82)",
      "rgba(57,196,154,0.82)",
      "rgba(255,183,94,0.82)",
      "rgba(124,146,232,0.82)",
    ];

    return {
      labels,
      datasets: [
        {
          label: "Expected Dice",
          data,
          backgroundColor,
          borderRadius: 4,
        },
      ],
    };
  }, [poolExpectations]);

  const outcomeChartData: ChartData<"bar"> | null = useMemo(() => {
    if (!validation.ok || !validation.data || !outcome || !poolExpectations) {
      return null;
    }

    const hitDice = outcome.expectedHitSuccesses + validation.data.hitsX;
    const safeDice = Math.max(0, poolExpectations.armourPoolDice - outcome.expectedFailedArmourDice);
    const preEvadeDamageDice = outcome.expectedDamagePoolDice;
    const evadedDice = validation.data.evadeEnabled
      ? Math.max(0, preEvadeDamageDice - outcome.expectedHealthInflictedDice)
      : 0;
    const healthInflictingDice = outcome.expectedHealthInflictedDice;
    const labels = validation.data.evadeEnabled
      ? ["Hit Dice", "Safe Dice", "Evaded Dice", "Damage Dice"]
      : ["Hit Dice", "Safe Dice", "Damage Dice"];
    const data = validation.data.evadeEnabled
      ? [
          Number(hitDice.toFixed(6)),
          Number(safeDice.toFixed(6)),
          Number(evadedDice.toFixed(6)),
          Number(healthInflictingDice.toFixed(6)),
        ]
      : [
          Number(hitDice.toFixed(6)),
          Number(safeDice.toFixed(6)),
          Number(healthInflictingDice.toFixed(6)),
        ];
    const backgroundColor = validation.data.evadeEnabled
      ? [
          "rgba(91,180,255,0.82)",
          "rgba(57,196,154,0.82)",
          "rgba(255,183,94,0.82)",
          "rgba(255,115,122,0.82)",
        ]
      : [
          "rgba(91,180,255,0.82)",
          "rgba(57,196,154,0.82)",
          "rgba(255,115,122,0.82)",
        ];

    return {
      labels,
      datasets: [
        {
          label: "Expected Dice",
          data,
          backgroundColor,
          borderRadius: 4,
        },
      ],
    };
  }, [validation, outcome, poolExpectations]);

  const chartKeySeed = useMemo(() => {
    if (!outcome) {
      return "empty";
    }
    const evadeState = values.evadeEnabled ? "evade-on" : "evade-off";
    const surgeState = values.surgeEnabled ? "surge-on" : "surge-off";
    return `${evadeState}-${surgeState}-${outcome.pmf.length}-${outcome.expectedTotalDamage.toFixed(6)}`;
  }, [outcome, values.evadeEnabled, values.surgeEnabled]);

  const hitsYEnabled = useMemo(() => {
    const parsedHitsX = Number(values.hitsX);
    return Number.isInteger(parsedHitsX) && parsedHitsX > 0;
  }, [values.hitsX]);
  const surgeFormulaDisabled = !values.surgeEnabled;
  const parsedModelCount = Number(values.modelCount);
  const modelCountIsZero =
    values.modelCount.trim() !== "" &&
    Number.isInteger(parsedModelCount) &&
    parsedModelCount === 0;

  function updateValue(name: keyof AttackFormValues, value: string): void {
    setValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  return (
    <section className="panel" style={{ padding: "1.05rem", display: "grid", gap: "1.1rem" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
          gap: "1rem",
        }}
      >
        <section className="panel" style={{ padding: "0.9rem", display: "grid", gap: "0.95rem", alignContent: "start" }}>
          <h2 style={{ margin: 0, fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-soft)" }}>
            Attack Stats
          </h2>

          <div className="attack-primary-grid">
            <NumberField
              label="Model"
              name="modelCount"
              value={values.modelCount}
              min={0}
              error={validation.errors.modelCount}
              labelTitle="Amount of attacker models attacking with this weapon."
              onChange={updateValue}
            />
            <NumberField
              label="RoA"
              name="rateOfAttack"
              value={values.rateOfAttack}
              min={1}
              disabled={modelCountIsZero}
              error={validation.errors.rateOfAttack}
              labelTitle="Rate of Attack."
              onChange={updateValue}
            />
            <NumberField
              label="Hit"
              name="hitTarget"
              value={values.hitTarget}
              min={2}
              max={6}
              disabled={modelCountIsZero}
              error={validation.errors.hitTarget}
              onChange={updateValue}
            />
            <NumberField
              label="Damage"
              name="damagePerDie"
              value={values.damagePerDie}
              min={1}
              disabled={modelCountIsZero}
              error={validation.errors.damagePerDie}
              labelTitle="Damage per die."
              onChange={updateValue}
            />
          </div>

          <div style={{ display: "grid", alignContent: "start", gap: "0.55rem" }}>
            <label style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center", fontWeight: 600, color: "var(--ink)" }}>
              <input
                type="checkbox"
                checked={values.surgeEnabled}
                onChange={(event) => {
                  const checked = event.currentTarget.checked;
                  setValues((current) => ({
                    ...current,
                    surgeEnabled: checked,
                    surgeFormula:
                      checked && current.surgeFormula.trim() === "" ? "d3" : current.surgeFormula,
                  }));
                }}
              />
              Enable Surge
            </label>

            <label style={{ display: "block", fontSize: "0.94rem" }}>
              <span style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
                Surge Formula
              </span>
              <input
                type="text"
                value={values.surgeFormula}
                disabled={surgeFormulaDisabled}
                placeholder="Ex: d3, d3+1, d6"
                onChange={(event) => updateValue("surgeFormula", event.currentTarget.value)}
                className={`mono surge-formula-input${surgeFormulaDisabled ? " is-input-disabled" : ""}`}
                style={{
                  width: "100%",
                  padding: "0.58rem 0.65rem",
                  borderRadius: 9,
                  border: surgeFormulaDisabled
                    ? "1px solid var(--line-disabled)"
                    : "1px solid var(--line)",
                  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.02)",
                  fontSize: "0.95rem",
                  color: surgeFormulaDisabled ? "var(--text-disabled)" : "var(--ink)",
                  backgroundColor: surgeFormulaDisabled ? "var(--bg-input-disabled)" : "var(--bg-input)",
                  backgroundImage: surgeFormulaDisabled ? DISABLED_TINT_PATTERN : "none",
                  cursor: surgeFormulaDisabled ? "not-allowed" : "text",
                  transition: "border-color 130ms ease, box-shadow 130ms ease",
                }}
              />
              <FieldError error={values.surgeEnabled ? validation.errors.surgeFormula : undefined} />
            </label>

            <NumberField
              label="CRITICAL HIT (X)"
              name="critX"
              value={values.critX}
              min={0}
              error={validation.errors.critX}
              labelTitle="CRITICAL HIT (X): move up to X dice from Armour Pool directly to Damage Pool."
              onChange={updateValue}
            />
            <NumberField
              label="PRECISION (X)"
              name="precisionX"
              value={values.precisionX}
              min={0}
              error={validation.errors.precisionX}
              labelTitle="PRECISION (X): move up to X failed Attack Dice into Armour Pool as successful hits."
              onChange={updateValue}
            />
          </div>

          <div style={{ display: "grid", gap: "0.5rem" }}>
            <p
              title="HITS X (Y): Unit suffers X automatic hits. Set X dice directly into Armour Pool and treat Damage as Y. These hits do not generate Surge."
              style={{ margin: 0, fontWeight: 600, color: "var(--ink)" }}
            >
              HITS X (Y)
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: "0.75rem" }}>
              <NumberField
                label="HITS X"
                name="hitsX"
                value={values.hitsX}
                min={0}
                error={validation.errors.hitsX}
                labelTitle="HITS X (Y): Unit suffers X automatic hits set directly into Armour Pool."
                onChange={(_name, value) => {
                  const parsedHitsX = Number(value);
                  const enableHitsY = Number.isInteger(parsedHitsX) && parsedHitsX > 0;

                  setValues((current) => ({
                    ...current,
                    hitsX: value,
                    hitsY:
                      enableHitsY && current.hitsY.trim() === "" ? "2" : current.hitsY,
                  }));
                }}
              />
              <NumberField
                label="HITS Y"
                name="hitsY"
                value={values.hitsY}
                min={1}
                disabled={!hitsYEnabled}
                error={hitsYEnabled ? validation.errors.hitsY : undefined}
                labelTitle="HITS X (Y): Treat Damage characteristic as Y for those automatic hits."
                onChange={updateValue}
              />
            </div>
          </div>
        </section>

        <section className="panel" style={{ padding: "0.9rem", display: "grid", gap: "0.95rem", alignContent: "start" }}>
          <h2 style={{ margin: 0, fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-soft)" }}>
            Defend Stats
          </h2>

          <div className="defend-primary-grid">
            <NumberField
              label="Armour"
              name="armourTarget"
              value={values.armourTarget}
              min={2}
              max={6}
              error={validation.errors.armourTarget}
              onChange={updateValue}
            />
            <NumberField
              label="Evade"
              name="evadeTarget"
              value={values.evadeTarget}
              min={2}
              max={6}
              disabled={!values.evadeEnabled}
              error={values.evadeEnabled ? validation.errors.evadeTarget : undefined}
              onChange={updateValue}
            />
          </div>

          <div style={{ display: "grid", alignContent: "start", gap: "0.55rem" }}>
            <label style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center", fontWeight: 600, color: "var(--ink)" }}>
              <input
                type="checkbox"
                checked={values.evadeEnabled}
                onChange={(event) => {
                  const checked = event.currentTarget.checked;
                  setValues((current) => ({
                    ...current,
                    evadeEnabled: checked,
                    evadeTarget:
                      checked && current.evadeTarget.trim() === "" ? "6" : current.evadeTarget,
                  }));
                }}
              />
              Enable Evade
            </label>
          </div>

          <NumberField
            label="TOUGH (X)"
            name="toughX"
            value={values.toughX}
            min={0}
            error={validation.errors.toughX}
            labelTitle="TOUGH (X): change up to X failed Armour results into successes."
            onChange={updateValue}
          />
          <NumberField
            label="DODGE (X)"
            name="dodgeX"
            value={values.dodgeX}
            min={0}
            error={validation.errors.dodgeX}
            labelTitle="DODGE (X): reduce total bypass dice moved by Surge + CRITICAL HIT by X (minimum 0)."
            onChange={updateValue}
          />
        </section>
      </div>

      {!validation.ok && (
        <p role="alert" style={{ margin: 0, color: "var(--danger)", fontWeight: 600 }}>
          Fix validation errors to compute results.
        </p>
      )}

      {outcome && poolExpectations && pmfChartData && poolChartData && outcomeChartData && (
        <>
          <section
            className="panel"
            style={{
              borderRadius: 12,
              padding: "0.9rem",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
            }}
          >
            <article>
              <h2 style={{ margin: "0 0 0.45rem", fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-soft)" }}>
                Expected Totals
              </h2>
              <p style={{ margin: "0 0 0.2rem", fontSize: "1.3rem", fontWeight: 700, color: "var(--accent)" }}>
                {formatNumber(outcome.expectedTotalDamage)} damage
              </p>
              <p style={{ margin: 0, color: "var(--ink-soft)" }}>
                {formatNumber(outcome.expectedHealthInflictedDice)} expected health-inflicting dice
              </p>
            </article>
            <article>
              <h2 style={{ margin: "0 0 0.45rem", fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-soft)" }}>
                Pool Expectations
              </h2>
              <p style={{ margin: "0 0 0.2rem" }}>Attack Pool: {formatNumber(poolExpectations.attackPoolDice)}</p>
              <p style={{ margin: "0 0 0.2rem" }}>Armour Pool: {formatNumber(poolExpectations.armourPoolDice)}</p>
              <p style={{ margin: "0 0 0.2rem" }}>Damage Pool: {formatNumber(poolExpectations.damagePoolDice)}</p>
              <p style={{ margin: "0 0 0.2rem" }}>Health Inflict: {formatNumber(poolExpectations.healthInflictDice)}</p>
            </article>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            <article className="panel" style={{ padding: "0.9rem" }}>
              <h2 style={{ margin: "0 0 0.6rem", fontSize: "1rem" }}>PMF by Total Damage (%)</h2>
              <div style={{ height: "245px" }}>
                <Bar
                  key={`pmf-${chartKeySeed}`}
                  redraw
                  data-testid="pmf-chart"
                  data={pmfChartData}
                  options={{
                    ...CHART_OPTIONS,
                    scales: {
                      ...CHART_OPTIONS.scales,
                      y: {
                        ...CHART_OPTIONS.scales?.y,
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: "Probability (%)",
                          color: CHART_TEXT,
                        },
                      },
                      x: {
                        ...CHART_OPTIONS.scales?.x,
                        title: {
                          display: true,
                          text: "Total Damage",
                          color: CHART_TEXT,
                        },
                      },
                    },
                  }}
                />
              </div>
            </article>

            <article className="panel" style={{ padding: "0.9rem" }}>
              <h2 style={{ margin: "0 0 0.6rem", fontSize: "1rem" }}>Pool Dice Expectations</h2>
              <div style={{ height: "245px" }}>
                <Bar
                  key={`pool-${chartKeySeed}`}
                  redraw
                  data-testid="pool-chart"
                  data={poolChartData}
                  options={{
                    ...CHART_OPTIONS,
                    scales: {
                      ...CHART_OPTIONS.scales,
                      y: {
                        ...CHART_OPTIONS.scales?.y,
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: "Expected Dice",
                          color: CHART_TEXT,
                        },
                      },
                    },
                  }}
                />
              </div>
            </article>

            <article className="panel" style={{ padding: "0.9rem" }}>
              <h2 style={{ margin: "0 0 0.6rem", fontSize: "1rem" }}>Dice Outcome Breakdown</h2>
              <div style={{ height: "245px" }}>
                <Bar
                  key={`outcome-${chartKeySeed}`}
                  redraw
                  data-testid="outcome-chart"
                  data={outcomeChartData}
                  options={{
                    ...CHART_OPTIONS,
                    scales: {
                      ...CHART_OPTIONS.scales,
                      y: {
                        ...CHART_OPTIONS.scales?.y,
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: "Expected Dice",
                          color: CHART_TEXT,
                        },
                      },
                    },
                  }}
                />
              </div>
            </article>
          </section>

          <section className="panel" style={{ padding: "0.9rem", overflowX: "auto" }}>
            <h2 style={{ margin: "0 0 0.6rem", fontSize: "1rem" }}>Probability Mass Function</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 240 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "0.45rem", borderBottom: "1px solid var(--line)" }}>Total Damage</th>
                  <th style={{ textAlign: "right", padding: "0.45rem", borderBottom: "1px solid var(--line)" }}>Probability</th>
                </tr>
              </thead>
              <tbody>
                {outcome.pmf.map((entry) => (
                  <tr key={entry.value}>
                    <td style={{ padding: "0.4rem 0.45rem", borderBottom: "1px solid var(--line)" }}>{entry.value}</td>
                    <td style={{ padding: "0.4rem 0.45rem", textAlign: "right", borderBottom: "1px solid var(--line)" }}>
                      {formatPercent(entry.probability)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </section>
  );
}
