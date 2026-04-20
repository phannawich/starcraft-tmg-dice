import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AttackCalculator from "@/components/AttackCalculator";

vi.mock("react-chartjs-2", () => ({
  Bar: (props: { data: unknown; options?: unknown; "data-testid"?: string }) => (
    <div
      data-testid={props["data-testid"] ?? "chart"}
      data-chart={JSON.stringify(props.data)}
      data-options={JSON.stringify(props.options)}
    />
  ),
}));

describe("AttackCalculator", () => {
  it("renders expected summary outputs", () => {
    render(<AttackCalculator />);

    expect(screen.getByText(/expected totals/i)).toBeInTheDocument();
    expect(screen.getByText(/probability mass function/i)).toBeInTheDocument();
    expect(screen.getByTestId("pmf-chart")).toBeInTheDocument();
    expect(screen.getByTestId("pool-chart")).toBeInTheDocument();
    expect(screen.getByTestId("outcome-chart")).toBeInTheDocument();

    const surgeCheckbox = screen.getByRole("checkbox", { name: /enable surge/i });
    expect(surgeCheckbox).not.toBeChecked();

    const surgeFormulaInput = screen.getByLabelText(/surge formula/i);
    expect(surgeFormulaInput).toHaveValue("d3");
    expect(surgeFormulaInput).toBeDisabled();
    expect(surgeFormulaInput).toHaveClass("is-input-disabled");
    expect(surgeFormulaInput).toHaveAttribute("placeholder", "Ex: d3, d3+1, d6");

    const modelInput = screen.getByLabelText(/^model$/i);
    expect(modelInput).toHaveAttribute("placeholder", "Ex: 2");

    expect(screen.getByLabelText(/^hits x$/i)).toBeInTheDocument();
    const hitsYInput = screen.getByLabelText(/^hits y$/i);
    expect(hitsYInput).toBeInTheDocument();
    expect(hitsYInput).toBeDisabled();
    expect(hitsYInput).toHaveClass("is-input-disabled");
    expect(screen.getByLabelText(/tough \(x\)/i)).toBeInTheDocument();

    const critInput = screen.getByLabelText(/critical hit \(x\)/i);
    expect(critInput).toBeInTheDocument();
    expect(screen.getByLabelText(/precision \(x\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dodge \(x\)/i)).toBeInTheDocument();

    expect(screen.queryByLabelText(/weapon surge type/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/target combat tag/i)).not.toBeInTheDocument();
  });

  it("updates chart labels/data when an input changes", async () => {
    const user = userEvent.setup();
    render(<AttackCalculator />);

    const chartBefore = screen.getByTestId("pmf-chart").getAttribute("data-chart") ?? "";

    const damageInput = screen.getByLabelText(/^damage$/i);
    await user.clear(damageInput);
    await user.type(damageInput, "3");

    const chartAfter = screen.getByTestId("pmf-chart").getAttribute("data-chart") ?? "";
    expect(chartAfter).not.toEqual(chartBefore);
  });

  it("updates chart labels/data when precision or dodge changes", async () => {
    const user = userEvent.setup();
    render(<AttackCalculator />);

    const chartBefore = screen.getByTestId("pmf-chart").getAttribute("data-chart") ?? "";

    const precisionInput = screen.getByLabelText(/precision \(x\)/i);
    const dodgeInput = screen.getByLabelText(/dodge \(x\)/i);
    await user.clear(precisionInput);
    await user.type(precisionInput, "2");
    await user.clear(dodgeInput);
    await user.type(dodgeInput, "1");

    const chartAfter = screen.getByTestId("pmf-chart").getAttribute("data-chart") ?? "";
    expect(chartAfter).not.toEqual(chartBefore);
  });

  it("preserves shared axis styling when chart titles are added", () => {
    render(<AttackCalculator />);

    const getChartOptions = (testId: string) => {
      const chartOptionsRaw = screen.getByTestId(testId).getAttribute("data-options");
      if (!chartOptionsRaw) {
        return {};
      }
      return JSON.parse(chartOptionsRaw) as {
        scales?: {
          x?: { ticks?: { color?: string }; grid?: { color?: string }; title?: { text?: string } };
          y?: { ticks?: { color?: string; precision?: number }; grid?: { color?: string }; title?: { text?: string } };
        };
      };
    };

    const pmfOptions = getChartOptions("pmf-chart");
    expect(pmfOptions.scales?.x?.ticks?.color).toBe("rgba(166,178,199,0.92)");
    expect(pmfOptions.scales?.x?.grid?.color).toBe("rgba(43,54,72,0.58)");
    expect(pmfOptions.scales?.y?.ticks?.color).toBe("rgba(166,178,199,0.92)");
    expect(pmfOptions.scales?.y?.ticks?.precision).toBe(0);
    expect(pmfOptions.scales?.y?.grid?.color).toBe("rgba(43,54,72,0.58)");
    expect(pmfOptions.scales?.x?.title?.text).toBe("Total Damage");
    expect(pmfOptions.scales?.y?.title?.text).toBe("Probability (%)");

    const poolOptions = getChartOptions("pool-chart");
    expect(poolOptions.scales?.y?.ticks?.color).toBe("rgba(166,178,199,0.92)");
    expect(poolOptions.scales?.y?.ticks?.precision).toBe(0);
    expect(poolOptions.scales?.y?.grid?.color).toBe("rgba(43,54,72,0.58)");
    expect(poolOptions.scales?.y?.title?.text).toBe("Expected Dice");

    const outcomeOptions = getChartOptions("outcome-chart");
    expect(outcomeOptions.scales?.y?.ticks?.color).toBe("rgba(166,178,199,0.92)");
    expect(outcomeOptions.scales?.y?.ticks?.precision).toBe(0);
    expect(outcomeOptions.scales?.y?.grid?.color).toBe("rgba(43,54,72,0.58)");
    expect(outcomeOptions.scales?.y?.title?.text).toBe("Expected Dice");
  });

  it("shows validation error for invalid threshold", async () => {
    const user = userEvent.setup();
    render(<AttackCalculator />);

    const hitTargetInput = screen.getByLabelText(/^hit$/i);
    await user.clear(hitTargetInput);
    await user.type(hitTargetInput, "7");

    expect(await screen.findByText(/fix validation errors/i)).toBeInTheDocument();
  });

  it("enables hits y when hits x is above zero", async () => {
    const user = userEvent.setup();
    render(<AttackCalculator />);

    const hitsXInput = screen.getByLabelText(/^hits x$/i);
    const hitsYInput = screen.getByLabelText(/^hits y$/i);
    expect(hitsYInput).toBeDisabled();
    expect(hitsYInput).toHaveClass("is-input-disabled");

    await user.clear(hitsXInput);
    await user.type(hitsXInput, "2");
    expect(hitsYInput).not.toBeDisabled();
    expect(hitsYInput).not.toHaveClass("is-input-disabled");
  });

  it("supports zero models and keeps armour pool from HITS X", async () => {
    const user = userEvent.setup();
    render(<AttackCalculator />);

    const modelInput = screen.getByLabelText(/^model$/i);
    const hitsXInput = screen.getByLabelText(/^hits x$/i);
    const hitsYInput = screen.getByLabelText(/^hits y$/i);

    await user.clear(modelInput);
    await user.type(modelInput, "0");
    await user.clear(hitsXInput);
    await user.type(hitsXInput, "3");
    await user.clear(hitsYInput);
    await user.type(hitsYInput, "1");

    expect(screen.queryByText(/fix validation errors/i)).not.toBeInTheDocument();

    const poolChartRaw = screen.getByTestId("pool-chart").getAttribute("data-chart");
    expect(poolChartRaw).toBeTruthy();

    const poolChart = JSON.parse(poolChartRaw ?? "{}") as {
      datasets?: Array<{ data?: number[] }>;
    };
    const poolData = poolChart.datasets?.[0]?.data ?? [];

    expect(poolData[0]).toBe(0);
    expect(poolData[1]).toBe(3);
  });

  it("locks RoA, Hit, and Damage when model is zero", async () => {
    const user = userEvent.setup();
    render(<AttackCalculator />);

    const modelInput = screen.getByLabelText(/^model$/i);
    const roaInput = screen.getByLabelText(/^roa$/i);
    const hitInput = screen.getByLabelText(/^hit$/i);
    const damageInput = screen.getByLabelText(/^damage$/i);

    expect(roaInput).not.toBeDisabled();
    expect(hitInput).not.toBeDisabled();
    expect(damageInput).not.toBeDisabled();

    await user.clear(modelInput);
    await user.type(modelInput, "0");

    expect(roaInput).toBeDisabled();
    expect(hitInput).toBeDisabled();
    expect(damageInput).toBeDisabled();
    expect(roaInput).toHaveClass("is-input-disabled");
    expect(hitInput).toHaveClass("is-input-disabled");
    expect(damageInput).toHaveClass("is-input-disabled");

    await user.clear(modelInput);
    await user.type(modelInput, "1");

    expect(roaInput).not.toBeDisabled();
    expect(hitInput).not.toBeDisabled();
    expect(damageInput).not.toBeDisabled();
  });

  it("enables surge formula editing when surge turned on", async () => {
    const user = userEvent.setup();
    render(<AttackCalculator />);

    const surgeCheckbox = screen.getByRole("checkbox", { name: /enable surge/i });
    const surgeFormulaInput = screen.getByLabelText(/surge formula/i);

    expect(surgeFormulaInput).toBeDisabled();
    expect(surgeFormulaInput).toHaveClass("is-input-disabled");

    await user.click(surgeCheckbox);
    expect(surgeCheckbox).toBeChecked();
    expect(surgeFormulaInput).not.toBeDisabled();
    expect(surgeFormulaInput).not.toHaveClass("is-input-disabled");
  });

  it("keeps calculator working after evade toggle on then off", async () => {
    const user = userEvent.setup();
    render(<AttackCalculator />);

    const evadeCheckbox = screen.getByRole("checkbox", { name: /enable evade/i });
    const evadeTargetInput = screen.getByLabelText(/^evade$/i);
    expect(evadeCheckbox).not.toBeChecked();
    expect(evadeTargetInput).toBeDisabled();
    expect(evadeTargetInput).toHaveClass("is-input-disabled");

    await user.click(evadeCheckbox);
    expect(evadeCheckbox).toBeChecked();
    expect(evadeTargetInput).not.toBeDisabled();
    expect(evadeTargetInput).not.toHaveClass("is-input-disabled");

    await user.click(evadeCheckbox);
    expect(evadeCheckbox).not.toBeChecked();
    expect(evadeTargetInput).toBeDisabled();
    expect(evadeTargetInput).toHaveClass("is-input-disabled");

    expect(screen.getByText(/expected totals/i)).toBeInTheDocument();
  });

  it("keeps pool chart stages fixed and does not show an evade pool stage", async () => {
    const user = userEvent.setup();
    render(<AttackCalculator />);

    const getPoolLabels = (): string[] => {
      const chartDataRaw = screen.getByTestId("pool-chart").getAttribute("data-chart");
      if (!chartDataRaw) {
        return [];
      }
      const parsed = JSON.parse(chartDataRaw) as { labels?: string[] };
      return parsed.labels ?? [];
    };

    expect(getPoolLabels()).toEqual([
      "Attack Pool",
      "Armour Pool",
      "Damage Pool",
      "Health Inflict",
    ]);

    const evadeCheckbox = screen.getByRole("checkbox", { name: /enable evade/i });
    await user.click(evadeCheckbox);

    expect(getPoolLabels()).toEqual([
      "Attack Pool",
      "Armour Pool",
      "Damage Pool",
      "Health Inflict",
    ]);
  });

  it("updates outcome chart evaded dice when evade is enabled", async () => {
    const user = userEvent.setup();
    render(<AttackCalculator />);

    const getOutcomeData = (): { labels: string[]; data: number[] } => {
      const chartDataRaw = screen.getByTestId("outcome-chart").getAttribute("data-chart");
      if (!chartDataRaw) {
        return { labels: [], data: [] };
      }
      const parsed = JSON.parse(chartDataRaw) as {
        labels?: string[];
        datasets?: Array<{ data?: number[] }>;
      };
      return {
        labels: parsed.labels ?? [],
        data: parsed.datasets?.[0]?.data ?? [],
      };
    };

    const before = getOutcomeData();
    expect(before.labels).toEqual(["Hit Dice", "Safe Dice", "Damage Dice"]);
    expect(before.data).toHaveLength(3);

    const evadeCheckbox = screen.getByRole("checkbox", { name: /enable evade/i });
    await user.click(evadeCheckbox);

    const after = getOutcomeData();
    expect(after.labels).toEqual(["Hit Dice", "Safe Dice", "Evaded Dice", "Damage Dice"]);
    expect(after.data[2]).toBeGreaterThan(0);
    expect(after.data[3]).toBeLessThan(before.data[2]);
  });
});
