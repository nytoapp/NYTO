import { intlLocale } from "../../i18n";

export type PhoneCountry = {
  iso: string;
  name: string;
  dial: string;
  min: number;
  max: number;
};

/** National length is the subscriber number after the country code, without a trunk 0. */
export const phoneCountries: PhoneCountry[] = [
  { iso: "SE", name: "Sweden", dial: "46", min: 7, max: 13 },
  { iso: "NO", name: "Norway", dial: "47", min: 8, max: 8 },
  { iso: "DK", name: "Denmark", dial: "45", min: 8, max: 8 },
  { iso: "FI", name: "Finland", dial: "358", min: 5, max: 12 },
  { iso: "DE", name: "Germany", dial: "49", min: 6, max: 13 },
  { iso: "FR", name: "France", dial: "33", min: 9, max: 9 },
  { iso: "NL", name: "Netherlands", dial: "31", min: 9, max: 9 },
  { iso: "GB", name: "United Kingdom", dial: "44", min: 9, max: 10 },
  { iso: "IE", name: "Ireland", dial: "353", min: 7, max: 9 },
  { iso: "ES", name: "Spain", dial: "34", min: 9, max: 9 },
  { iso: "PT", name: "Portugal", dial: "351", min: 9, max: 9 },
  { iso: "IT", name: "Italy", dial: "39", min: 6, max: 11 },
  { iso: "BE", name: "Belgium", dial: "32", min: 8, max: 9 },
  { iso: "CH", name: "Switzerland", dial: "41", min: 9, max: 9 },
  { iso: "AT", name: "Austria", dial: "43", min: 4, max: 13 },
  { iso: "PL", name: "Poland", dial: "48", min: 9, max: 9 },
  { iso: "CZ", name: "Czechia", dial: "420", min: 9, max: 9 },
  { iso: "GR", name: "Greece", dial: "30", min: 10, max: 10 },
  { iso: "IS", name: "Iceland", dial: "354", min: 7, max: 7 },
  { iso: "EE", name: "Estonia", dial: "372", min: 7, max: 8 },
  { iso: "LV", name: "Latvia", dial: "371", min: 8, max: 8 },
  { iso: "LT", name: "Lithuania", dial: "370", min: 8, max: 8 },
  { iso: "LU", name: "Luxembourg", dial: "352", min: 8, max: 11 },
  { iso: "US", name: "United States", dial: "1", min: 10, max: 10 },
  { iso: "CA", name: "Canada", dial: "1", min: 10, max: 10 },
  { iso: "IN", name: "India", dial: "91", min: 10, max: 10 },
  { iso: "AU", name: "Australia", dial: "61", min: 9, max: 9 },
  { iso: "JP", name: "Japan", dial: "81", min: 9, max: 10 },
  { iso: "KR", name: "South Korea", dial: "82", min: 8, max: 11 },
  { iso: "SG", name: "Singapore", dial: "65", min: 8, max: 8 },
  { iso: "AE", name: "United Arab Emirates", dial: "971", min: 8, max: 9 },
  { iso: "BR", name: "Brazil", dial: "55", min: 10, max: 11 },
];

export function suggestPhoneCountry(regionCode: string | null | undefined): PhoneCountry | null {
  const iso = regionCode?.trim().toUpperCase();
  if (!iso) return null;
  return phoneCountries.find((country) => country.iso === iso) ?? null;
}

export function countryFlag(iso: string): string {
  const code = iso.toUpperCase();
  if (code.length !== 2) return code;
  return String.fromCodePoint(...code.split("").map((char) => 0x1f1e6 + char.charCodeAt(0) - 65));
}

export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const digits = e164.replace(/\D/g, "");
  if (!digits) return "";
  const country = phoneCountries
    .filter((item) => {
      if (!digits.startsWith(item.dial)) return false;
      const length = digits.length - item.dial.length;
      return length >= item.min && length <= item.max;
    })
    .sort((a, b) => b.dial.length - a.dial.length)[0];
  if (!country) return e164.startsWith("+") ? e164 : `+${digits}`;
  return `+${country.dial} ${groupNational(digits.slice(country.dial.length))}`;
}

function groupNational(national: string): string {
  if (national.length <= 4) return national;
  if (national.length <= 6) return `${national.slice(0, 3)} ${national.slice(3)}`;
  if (national.length <= 10) {
    const split = national.length > 8 ? 5 : 4;
    return `${national.slice(0, split)} ${national.slice(split)}`;
  }
  return national.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

export function nationalNumber(input: string, max: number): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, max);
}

export function phoneReady(country: PhoneCountry, national: string): boolean {
  return national.length >= country.min && national.length <= country.max;
}

export function countryLabel(country: PhoneCountry): string {
  try {
    const label = new Intl.DisplayNames([intlLocale()], { type: "region" }).of(country.iso);
    if (label && label.toUpperCase() !== country.iso) return label;
  } catch {
    return country.name;
  }
  return country.name;
}

export function matchCountries(query: string): PhoneCountry[] {
  const needle = query.trim().toLowerCase().replace(/^\+/, "");
  if (!needle) return phoneCountries;
  return phoneCountries.filter((country) => `${country.name} ${countryLabel(country)} ${country.iso} ${country.dial}`.toLowerCase().includes(needle));
}
