import { formatMileage } from "@/lib/format";
import type { VehicleFormValues } from "@/lib/validation/vehicle";

export const FEATURE_GROUPS: { name: string; features: string[] }[] = [
  {
    name: "Safety",
    features: [
      "Backup camera",
      "Blind spot monitor",
      "Lane departure warning",
      "Forward collision warning",
      "Automatic emergency braking",
      "Adaptive cruise control",
      "Parking sensors",
      "360° camera",
    ],
  },
  {
    name: "Tech",
    features: [
      "Apple CarPlay",
      "Android Auto",
      "Bluetooth",
      "Navigation",
      "Premium sound",
      "USB ports",
      "Wireless charging",
      "Keyless entry",
      "Push-button start",
      "Remote start",
    ],
  },
  {
    name: "Comfort",
    features: [
      "Leather seats",
      "Heated seats",
      "Cooled seats",
      "Heated steering wheel",
      "Power seats",
      "Dual-zone climate",
      "Third-row seating",
    ],
  },
  {
    name: "Exterior",
    features: [
      "Sunroof / moonroof",
      "Alloy wheels",
      "Tow package",
      "Roof rails",
      "Power liftgate",
      "LED headlights",
      "Running boards",
    ],
  },
];

export const ALL_PRESET_FEATURES = new Set(FEATURE_GROUPS.flatMap((g) => g.features));

export const EXTERIOR_COLORS = [
  "Black",
  "White",
  "Silver",
  "Gray",
  "Red",
  "Blue",
  "Green",
  "Brown",
  "Beige",
  "Gold",
  "Orange",
  "Yellow",
];
export const INTERIOR_COLORS = ["Black", "Gray", "Beige", "Tan", "Brown", "White", "Red"];

const LABELS = {
  transmission: { automatic: "automatic", manual: "manual", cvt: "CVT" },
  drivetrain: {
    fwd: "front-wheel drive",
    rwd: "rear-wheel drive",
    awd: "all-wheel drive",
    "4wd": "4-wheel drive",
  },
  title: { clean: "Clean", rebuilt: "Rebuilt", salvage: "Salvage", other: "" },
} as const;

/** Plain description built from the form's specs (no AI). */
export function descriptionTemplate(v: VehicleFormValues) {
  const name = [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") || "This vehicle";
  const miles = formatMileage(Number(v.mileage.replace(/\D/g, "")) || null);
  const lines: string[] = [];

  lines.push(`${name}${miles ? ` with ${miles.replace(" mi", " miles")}` : ""}.`);

  const specs = [
    v.engine,
    v.transmission && `${LABELS.transmission[v.transmission]} transmission`,
    v.drivetrain && LABELS.drivetrain[v.drivetrain],
  ].filter(Boolean);
  if (specs.length) lines.push(`Powered by ${specs.join(", ")}.`);

  const colors = [
    v.exterior_color && `${v.exterior_color} exterior`,
    v.interior_color && `${v.interior_color} interior`,
  ].filter(Boolean);
  if (colors.length) lines.push(`${colors.join(" with ")}.`);

  if (v.features.length) lines.push(`Features include: ${v.features.join(", ")}.`);

  const title = v.title_status && LABELS.title[v.title_status];
  lines.push(
    `${title ? `${title} title. ` : ""}Call or text us to schedule a test drive — price includes all dealer fees.`,
  );
  return lines.join("\n\n");
}
