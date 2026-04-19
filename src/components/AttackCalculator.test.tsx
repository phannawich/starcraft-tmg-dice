import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AttackCalculator from "@/components/AttackCalculator";

vi.mock("react-chartjs-2", () => ({
  Bar: (props: { data: unknown; "data-testid"?: string }) => (
    <div
      data-testid={props["data-testid"] ?? "chart"}
      data-chart={JSON.stringify(props.data)}
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
    expect(surgeFormulaInput).toHaveStyle("cursor: not-allowed");
    expect((surgeFormulaInput as HTMLInputElement).style.border).toBe("1px solid var(--line-disabled)");
    expect(surgeFormulaInput).toHaveAttribute("placeholder", "Ex: d3, d3+1, d6");

    const modelInput = screen.getByLabelText(/^model$/i);
    expect(modelInput).toHaveAttribute("placeholder", "Ex: 2, 3");

    expect(screen.getByLabelText(/^hits x$/i)).toBeInTheDocument();
    const hitsYInput = screen.getByLabelText(/^hits y$/i);
    expect(hitsYInput).toBeInTheDocument();
    expect(hitsYInput).toBeDisabled();
    expect(hitsYInput).toHaveStyle("cursor: not-allowed");
    expect((hitsYInput as HTMLInputElement).style.border).toBe("1px solid var(--line-disabled)");
    expect(screen.getByLabelText(/tough \(x\)/i)).toBeInTheDocument();

    const critInput = screen.getByLabelText(/critical hit \(x\)/i);
    const surgeFormulaInputNode = screen.getByLabelText(/surge formula/i);
    const orderMask = surgeFormulaInputNode.compareDocumentPosition(critInput);
    expect(orderMask & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

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
    expect(hitsYInput).toHaveStyle("cursor: not-allowed");
    expect((hitsYInput as HTMLInputElement).style.border).toBe("1px solid var(--line-disabled)");

    await user.clear(hitsXInput);
    await user.type(hitsXInput, "2");
    expect(hitsYInput).not.toBeDisabled();
    expect(hitsYInput).toHaveStyle("cursor: text");
    expect((hitsYInput as HTMLInputElement).style.border).toBe("1px solid var(--line)");
  });

  it("enables surge formula editing when surge turned on", async () => {
    const user = userEvent.setup();
    render(<AttackCalculator />);

    const surgeCheckbox = screen.getByRole("checkbox", { name: /enable surge/i });
    const surgeFormulaInput = screen.getByLabelText(/surge formula/i);

    expect(surgeFormulaInput).toBeDisabled();
    expect(surgeFormulaInput).toHaveStyle("cursor: not-allowed");
    expect((surgeFormulaInput as HTMLInputElement).style.border).toBe("1px solid var(--line-disabled)");

    await user.click(surgeCheckbox);
    expect(surgeCheckbox).toBeChecked();
    expect(surgeFormulaInput).not.toBeDisabled();
    expect(surgeFormulaInput).toHaveStyle("cursor: text");
    expect((surgeFormulaInput as HTMLInputElement).style.border).toBe("1px solid var(--line)");
  });

  it("keeps calculator working after evade toggle on then off", async () => {
    const user = userEvent.setup();
    render(<AttackCalculator />);

    const evadeCheckbox = screen.getByRole("checkbox", { name: /enable evade/i });
    const evadeTargetInput = screen.getByLabelText(/^evade$/i);
    expect(evadeCheckbox).not.toBeChecked();
    expect(evadeTargetInput).toBeDisabled();
    expect(evadeTargetInput).toHaveStyle("cursor: not-allowed");
    expect((evadeTargetInput as HTMLInputElement).style.border).toBe("1px solid var(--line-disabled)");

    await user.click(evadeCheckbox);
    expect(evadeCheckbox).toBeChecked();
    expect(evadeTargetInput).not.toBeDisabled();
    expect(evadeTargetInput).toHaveStyle("cursor: text");
    expect((evadeTargetInput as HTMLInputElement).style.border).toBe("1px solid var(--line)");

    await user.click(evadeCheckbox);
    expect(evadeCheckbox).not.toBeChecked();
    expect(evadeTargetInput).toBeDisabled();
    expect(evadeTargetInput).toHaveStyle("cursor: not-allowed");
    expect((evadeTargetInput as HTMLInputElement).style.border).toBe("1px solid var(--line-disabled)");

    expect(screen.getByText(/expected totals/i)).toBeInTheDocument();
  });

  it("adds evade pool pillar to pool chart when evade is enabled", async () => {
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

    expect(getPoolLabels()).toEqual(["Attack Pool", "Armour Pool", "Damage Pool"]);

    const evadeCheckbox = screen.getByRole("checkbox", { name: /enable evade/i });
    await user.click(evadeCheckbox);

    expect(getPoolLabels()).toEqual(["Attack Pool", "Armour Pool", "Evade Pool", "Damage Pool"]);
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
  });
});
