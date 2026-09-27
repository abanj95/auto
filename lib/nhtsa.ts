import "server-only";

import type { Enums } from "@/lib/database.types";

/** Fields we can prefill from NHTSA vPIC. Everything is optional. */
export type VinDecode = Partial<{
  year: number;
  make: string;
  model: string;
  trim: string;
  body_type: Enums<"vehicle_body_type">;
  engine: string;
  drivetrain: Enums<"vehicle_drivetrain">;
  fuel_type: Enums<"vehicle_fuel_type">;
  transmission: Enums<"vehicle_transmission">;
}>;

const ACRONYMS = new Set(["BMW", "GMC", "RAM", "MINI", "FIAT", "KIA", "VW", "AMC"]);

/** NHTSA returns "TOYOTA" / "MERCEDES-BENZ"; show "Toyota" / "Mercedes-Benz". */
function brandCase(value: string) {
  return value
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((w) =>
      ACRONYMS.has(w.toUpperCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join("");
}

function bodyType(bodyClass: string): Enums<"vehicle_body_type"> | undefined {
  const b = bodyClass.toLowerCase();
  if (!b) return undefined;
  if (b.includes("convertible") || b.includes("roadster")) return "convertible";
  if (b.includes("sport utility") || b.includes("crossover") || b.includes("suv")) return "suv";
  if (b.includes("pickup") || b.includes("truck")) return "truck";
  if (b.includes("van")) return "van"; // van, minivan, cargo van
  if (b.includes("wagon")) return "wagon";
  if (b.includes("hatchback")) return "hatchback";
  if (b.includes("coupe")) return "coupe";
  if (b.includes("sedan")) return "sedan";
  return "other";
}

function drivetrain(driveType: string): Enums<"vehicle_drivetrain"> | undefined {
  const d = driveType.toUpperCase();
  if (d.includes("AWD") || d.includes("ALL-WHEEL")) return "awd";
  if (d.includes("4WD") || d.includes("4X4") || d.includes("4-WHEEL")) return "4wd";
  if (d.includes("FWD") || d.includes("FRONT")) return "fwd";
  if (d.includes("RWD") || d.includes("REAR")) return "rwd";
  return undefined; // e.g. "4x2" is ambiguous
}

function fuelType(
  primary: string,
  electrification: string,
): Enums<"vehicle_fuel_type"> | undefined {
  const e = electrification.toUpperCase();
  if (e.includes("BEV")) return "electric";
  if (e.includes("HEV")) return "hybrid"; // HEV, PHEV, MHEV
  const p = primary.toLowerCase();
  if (!p) return undefined;
  if (p.includes("electric")) return "electric";
  if (p.includes("diesel")) return "diesel";
  if (p.includes("gasoline") || p.includes("flexible")) return "gas";
  return "other";
}

function transmission(style: string): Enums<"vehicle_transmission"> | undefined {
  const s = style.toLowerCase();
  if (!s) return undefined;
  if (s.includes("cvt") || s.includes("continuously")) return "cvt";
  if (s.includes("manual") && !s.includes("automated")) return "manual";
  return "automatic"; // automatic, DCT, automated manual
}

function engine(r: Record<string, string>) {
  const litres = Number(r.DisplacementL);
  const cylinders = Number(r.EngineCylinders);
  const parts: string[] = [];
  if (litres > 0) parts.push(`${litres.toFixed(1)}L`);
  if (cylinders > 0) {
    parts.push(r.EngineConfiguration?.startsWith("V") ? `V${cylinders}` : `${cylinders}-cylinder`);
  }
  if (r.Turbo === "Yes") parts.push("turbo");
  if (
    !parts.length &&
    fuelType(r.FuelTypePrimary ?? "", r.ElectrificationLevel ?? "") === "electric"
  ) {
    return "Electric motor";
  }
  return parts.join(" ") || undefined;
}

/**
 * Decode a VIN with NHTSA vPIC (free, no key). Returns null when NHTSA has
 * nothing for it; throws on network errors/timeouts (caller shows a message).
 */
export async function decodeVin(vin: string): Promise<VinDecode | null> {
  const res = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(vin)}?format=json`,
    { signal: AbortSignal.timeout(6000), next: { revalidate: 60 * 60 * 24 } },
  );
  if (!res.ok) throw new Error(`NHTSA responded ${res.status}`);
  const json = (await res.json()) as { Results?: Record<string, string>[] };
  const r = json.Results?.[0];
  if (!r || !r.Make) return null;

  const year = Number(r.ModelYear);
  const result: VinDecode = {
    year: Number.isInteger(year) && year > 1900 ? year : undefined,
    make: brandCase(r.Make),
    model: r.Model || undefined,
    trim: (r.Trim || r.Series || "").trim() || undefined,
    body_type: bodyType(r.BodyClass ?? ""),
    engine: engine(r),
    drivetrain: drivetrain(r.DriveType ?? ""),
    fuel_type: fuelType(r.FuelTypePrimary ?? "", r.ElectrificationLevel ?? ""),
    transmission: transmission(r.TransmissionStyle ?? ""),
  };
  return Object.fromEntries(Object.entries(result).filter(([, v]) => v !== undefined)) as VinDecode;
}
