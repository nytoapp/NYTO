const zeroDecimal = new Set(["JPY", "KRW", "VND"]);

export function minorUnitExponent(currency: string): number {
  return zeroDecimal.has(currency.toUpperCase()) ? 0 : 2;
}

export function toMinorUnits(major: number, currency: string): number {
  const exponent = minorUnitExponent(currency);
  return Math.round(major * 10 ** exponent);
}
