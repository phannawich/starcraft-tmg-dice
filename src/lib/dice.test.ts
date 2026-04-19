import { describe, expect, it } from "vitest";
import { evaluateDiceDistribution, parseDiceExpression } from "@/lib/dice";

describe("parseDiceExpression", () => {
  it("parses d3", () => {
    expect(parseDiceExpression("d3")).toMatchObject({
      count: 1,
      sides: 3,
      modifier: 0,
      isConstant: false,
    });
  });

  it("parses 2d3+1", () => {
    expect(parseDiceExpression("2d3+1")).toMatchObject({
      count: 2,
      sides: 3,
      modifier: 1,
      isConstant: false,
    });
  });

  it("parses integer constants", () => {
    expect(parseDiceExpression("5")).toMatchObject({
      isConstant: true,
      constant: 5,
    });
  });

  it("rejects malformed expressions", () => {
    expect(() => parseDiceExpression("2d")).toThrowError();
    expect(() => parseDiceExpression("foo")).toThrowError();
    expect(() => parseDiceExpression("0d6")).toThrowError();
  });
});

describe("evaluateDiceDistribution", () => {
  it("produces a normalized distribution", () => {
    const dist = evaluateDiceDistribution("2d3+1");
    const total = dist.reduce((acc, item) => acc + item.probability, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("respects range boundaries", () => {
    const dist = evaluateDiceDistribution("2d3+1");
    expect(dist[0]?.value).toBe(3);
    expect(dist.at(-1)?.value).toBe(7);
  });
});
