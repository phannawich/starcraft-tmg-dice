export const DISPLAY_DECIMAL_MIN = 0;
export const DISPLAY_DECIMAL_MAX = 6;
export const DISPLAY_DECIMAL_DEFAULT = 4;

const FRACTION_MAX_DENOMINATOR = 1_000_000;
const FRACTION_APPROX_EPSILON = 1e-10;

export interface ProbabilityFractionParts {
  numerator: number;
  denominator: number;
  approximate: boolean;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y !== 0) {
    const tmp = x % y;
    x = y;
    y = tmp;
  }

  return x === 0 ? 1 : x;
}

function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) {
    return 0;
  }
  return Math.abs((a / gcd(a, b)) * b);
}

export function clampDecimalPlaces(value: number): number {
  if (!Number.isInteger(value)) {
    return DISPLAY_DECIMAL_DEFAULT;
  }
  if (value < DISPLAY_DECIMAL_MIN) {
    return DISPLAY_DECIMAL_MIN;
  }
  if (value > DISPLAY_DECIMAL_MAX) {
    return DISPLAY_DECIMAL_MAX;
  }
  return value;
}

export function formatNumberWithPrecision(value: number, decimalPlaces: number): string {
  const safePlaces = clampDecimalPlaces(decimalPlaces);
  return value.toLocaleString(undefined, {
    minimumFractionDigits: safePlaces,
    maximumFractionDigits: safePlaces,
  });
}

export function formatPercentWithPrecision(probability: number, decimalPlaces: number): string {
  return `${formatNumberWithPrecision(probability * 100, decimalPlaces)}%`;
}

function getProbabilityFractionParts(probability: number): ProbabilityFractionParts | null {
  if (!Number.isFinite(probability) || probability < 0) {
    return null;
  }
  if (probability === 0) {
    return { numerator: 0, denominator: 1, approximate: false };
  }
  if (probability >= 1) {
    return { numerator: 1, denominator: 1, approximate: false };
  }

  const original = probability;
  let x = probability;
  let p0 = 0;
  let q0 = 1;
  let p1 = 1;
  let q1 = 0;

  while (true) {
    const a = Math.floor(x);
    const q2 = q0 + a * q1;
    if (q2 > FRACTION_MAX_DENOMINATOR) {
      break;
    }
    const p2 = p0 + a * p1;

    p0 = p1;
    q0 = q1;
    p1 = p2;
    q1 = q2;

    const fractionalPart = x - a;
    if (Math.abs(fractionalPart) < 1e-15) {
      break;
    }
    x = 1 / fractionalPart;
  }

  const k = q1 === 0 ? 0 : Math.floor((FRACTION_MAX_DENOMINATOR - q0) / q1);
  const bound1Numerator = p0 + k * p1;
  const bound1Denominator = q0 + k * q1;
  const bound2Numerator = p1;
  const bound2Denominator = q1;

  let numerator = bound2Numerator;
  let denominator = bound2Denominator;
  if (bound1Denominator > 0) {
    const bound1Error = Math.abs(original - bound1Numerator / bound1Denominator);
    const bound2Error =
      bound2Denominator > 0
        ? Math.abs(original - bound2Numerator / bound2Denominator)
        : Number.POSITIVE_INFINITY;
    if (bound1Error <= bound2Error) {
      numerator = bound1Numerator;
      denominator = bound1Denominator;
    }
  }

  if (denominator <= 0) {
    return null;
  }

  const divisor = gcd(numerator, denominator);
  const reducedNumerator = Math.round(numerator / divisor);
  const reducedDenominator = Math.round(denominator / divisor);
  if (reducedDenominator <= 0) {
    return null;
  }
  const reconstructed = reducedNumerator / reducedDenominator;
  const approximate = Math.abs(original - reconstructed) > FRACTION_APPROX_EPSILON;

  return {
    numerator: reducedNumerator,
    denominator: reducedDenominator,
    approximate,
  };
}

export function getCommonProbabilityDenominator(probabilities: number[]): number {
  return probabilities.reduce((currentDenominator, probability) => {
    const parts = getProbabilityFractionParts(probability);
    if (!parts) {
      return currentDenominator;
    }
    const nextDenominator = lcm(currentDenominator, parts.denominator);
    return nextDenominator > 0 ? nextDenominator : currentDenominator;
  }, 1);
}

export function toProbabilityFraction(probability: number, commonDenominator?: number): string {
  const parts = getProbabilityFractionParts(probability);
  if (!parts) {
    return "0";
  }

  const prefix = parts.approximate ? "~" : "";
  if (commonDenominator && commonDenominator > 0) {
    const scaledNumerator = (parts.numerator * commonDenominator) / parts.denominator;
    if (Number.isInteger(scaledNumerator)) {
      return `${prefix}${scaledNumerator}/${commonDenominator}`;
    }
  }
  if (parts.numerator === 0) {
    return "0";
  }
  if (parts.numerator === parts.denominator) {
    return `${prefix}1`;
  }

  return `${prefix}${parts.numerator}/${parts.denominator}`;
}
