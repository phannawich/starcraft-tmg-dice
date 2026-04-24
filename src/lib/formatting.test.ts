import { describe, expect, it } from "vitest";

import {
  DISPLAY_DECIMAL_DEFAULT,
  clampDecimalPlaces,
  getCommonProbabilityDenominator,
  formatNumberWithPrecision,
  formatPercentWithPrecision,
  toProbabilityFraction,
} from "@/lib/formatting";

describe("formatting helpers", () => {
  it("clamps decimal places into allowed range", () => {
    expect(clampDecimalPlaces(-1)).toBe(0);
    expect(clampDecimalPlaces(0)).toBe(0);
    expect(clampDecimalPlaces(2)).toBe(2);
    expect(clampDecimalPlaces(7)).toBe(6);
  });

  it("falls back to default decimal places for non-integers", () => {
    expect(clampDecimalPlaces(2.1)).toBe(DISPLAY_DECIMAL_DEFAULT);
    expect(clampDecimalPlaces(Number.NaN)).toBe(DISPLAY_DECIMAL_DEFAULT);
  });

  it("formats numbers and percentages with requested precision", () => {
    expect(formatNumberWithPrecision(3.14159, 2)).toBe("3.14");
    expect(formatNumberWithPrecision(3.14159, 0)).toBe("3");
    expect(formatPercentWithPrecision(5 / 6, 2)).toBe("83.33%");
    expect(formatPercentWithPrecision(5 / 6, 6)).toBe("83.333333%");
  });

  it("renders common exact fractions", () => {
    expect(toProbabilityFraction(35 / 72)).toBe("35/72");
    expect(toProbabilityFraction(37 / 72)).toBe("37/72");
    expect(toProbabilityFraction(1 / 3)).toBe("1/3");
  });

  it("keeps table fractions on a shared denominator when requested", () => {
    const commonDenominator = getCommonProbabilityDenominator([1 / 2, 1 / 3, 1]);

    expect(commonDenominator).toBe(6);
    expect(toProbabilityFraction(1 / 2, commonDenominator)).toBe("3/6");
    expect(toProbabilityFraction(1 / 3, commonDenominator)).toBe("2/6");
    expect(toProbabilityFraction(1, commonDenominator)).toBe("6/6");
  });

  it("handles edge probabilities", () => {
    expect(toProbabilityFraction(0)).toBe("0");
    expect(toProbabilityFraction(1)).toBe("1");
    expect(toProbabilityFraction(-0.1)).toBe("0");
  });
});
