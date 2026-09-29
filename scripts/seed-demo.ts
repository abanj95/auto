/**
 * Demo content for testing the site: 2 demo vehicles (is_demo = true, shown
 * with a "Demo listing" badge) and 3 permanent hero slides. Photos are from
 * Unsplash (Unsplash License); credits in docs/image-credits.md.
 *
 *   pnpm tsx scripts/seed-demo.ts
 *
 * Safe to re-run: demo vehicles are replaced; slides with the same headline
 * are skipped. Remove the demo vehicles before launch with
 * `pnpm tsx scripts/remove-demo.ts`.
 *
 * Images are downloaded, resized with sharp (re-encoding drops all metadata,
 * incl. location) and uploaded. Public pages refresh within 5 minutes.
 */
import sharp from "sharp";

import type { TablesInsert } from "../lib/database.types";
import { adminClient, removeDemoVehicles, type Admin } from "./demo-common";

type Photo = { id: string; raw: string };

// ------------------------------------------------------------------ vehicles

const VEHICLES: {
  stock_no: string;
  vinPrefix: string; // positions 1–8
  vinSuffix: string; // positions 10–17
  data: Omit<TablesInsert<"vehicles">, "stock_no" | "vin">;
  photos: Photo[]; // Cover (front 3/4) first.
}[] = [
  {
    stock_no: "DEMO-0001",
    vinPrefix: "1C6SRFLT",
    vinSuffix: "MN900001",
    data: {
      year: 2021,
      make: "Ram",
      model: "1500",
      trim: "Rebel Crew Cab 4x4",
      body_type: "truck",
      mileage: 48730,
      price: 38995,
      exterior_color: "Red",
      interior_color: "Black",
      engine: "5.7L HEMI V8 eTorque",
      transmission: "automatic",
      drivetrain: "4wd",
      fuel_type: "gas",
      title_status: "clean",
      featured: true,
      features: [
        "Backup camera",
        "Blind spot monitor",
        "Apple CarPlay",
        "Android Auto",
        "Bluetooth",
        "Remote start",
        "Keyless entry",
        "Heated seats",
        "Heated steering wheel",
        "Power seats",
        "Tow package",
        "LED headlights",
      ],
      description: `Here's a truck that's as ready for the job site as it is for a weekend at the lake. This 2021 Ram 1500 Rebel has the 5.7L HEMI V8 with eTorque, 4x4 with the Rebel's off-road suspension and all-terrain tires, and a tow package, so hauling a camper or a boat is no problem.

Inside, the crew cab gives you real room for the whole family, with heated front seats, a heated steering wheel and remote start for those cold Pennsylvania mornings. Apple CarPlay and Android Auto, a backup camera and blind spot monitoring round it out.

It's been through our inspection, has a clean title, and the price you see includes our dealer fees. Stop by for a test drive, or call or text us with any questions.`,
    },
    photos: [
      { id: "Upo5dgiwpl4", raw: "https://images.unsplash.com/photo-1753476778215-a49f777cd185" },
      { id: "_M-Me5PZduE", raw: "https://images.unsplash.com/photo-1753476774321-b2aa701f1e6d" },
      { id: "TAvjnXX2R-g", raw: "https://images.unsplash.com/photo-1753476762406-a8179396e626" },
      { id: "mvnigde50Gg", raw: "https://images.unsplash.com/photo-1753476768634-d3f06127c7d1" },
      { id: "hiraWueiTj0", raw: "https://images.unsplash.com/photo-1753476788823-76beffee9971" },
    ],
  },
  {
    stock_no: "DEMO-0002",
    vinPrefix: "JM3KFBDM",
    vinSuffix: "L0900002",
    data: {
      year: 2020,
      make: "Mazda",
      model: "CX-5",
      trim: "Grand Touring AWD",
      body_type: "suv",
      mileage: 61240,
      price: 20995,
      exterior_color: "Gray",
      interior_color: "Black",
      engine: "2.5L 4-cylinder",
      transmission: "automatic",
      drivetrain: "awd",
      fuel_type: "gas",
      title_status: "clean",
      featured: false,
      features: [
        "Backup camera",
        "Blind spot monitor",
        "Lane departure warning",
        "Adaptive cruise control",
        "Apple CarPlay",
        "Android Auto",
        "Navigation",
        "Premium sound",
        "Leather seats",
        "Heated seats",
        "Power liftgate",
        "LED headlights",
      ],
      description: `If you want an SUV that feels a step above the usual, this 2020 Mazda CX-5 Grand Touring is worth a look. It's comfortable, quiet on the highway and genuinely fun to drive, and the all-wheel drive makes winter a lot less stressful.

The Grand Touring trim comes well equipped: black leather with heated front seats, navigation, a Bose premium sound system, a power liftgate and LED headlights. For safety you get adaptive cruise control, blind spot monitoring and lane departure warning, plus Apple CarPlay and Android Auto.

It has a clean title, it's been inspected and serviced, and the price includes our dealer fees. Come see it on the lot, or send us a text and we'll get back to you quickly.`,
    },
    photos: [
      { id: "969FKoxL-KU", raw: "https://images.unsplash.com/photo-1743114713466-f12a85992a75" },
      { id: "8mY0pDJfzPw", raw: "https://images.unsplash.com/photo-1762077656380-22733f2cd8da" },
      { id: "4V1Vs6QD43E", raw: "https://images.unsplash.com/photo-1743114713506-eaa60831ddfe" },
      { id: "a39t4-DbfSk", raw: "https://images.unsplash.com/photo-1743114713503-b698b8433f03" },
      { id: "AlVVCygOVTo", raw: "https://images.unsplash.com/photo-1743114713456-0d53a90182aa" },
    ],
  },
];

// ------------------------------------------------------------------ hero slides

const SLIDES: {
  photo: Photo;
  /** Horizontal center (0–1) of the 1080×1350 phone crop. */
  mobileCenter: number;
  /** Vertical center (0–1) of the 2400×1100 desktop crop (keep the car above the quick search). */
  desktopCenterY: number;
  data: Pick<
    TablesInsert<"hero_slides">,
    | "headline"
    | "button_label"
    | "button_link"
    | "text_position"
    | "overlay_strength"
    | "focal_point"
  >;
}[] = [
  {
    photo: {
      id: "_OaxFZBHSx4",
      raw: "https://images.unsplash.com/photo-1592891056565-d035c022bfdb",
    },
    mobileCenter: 0.62,
    desktopCenterY: 0.55,
    data: {
      headline: "Quality used cars, honest prices",
      button_label: "Browse inventory",
      button_link: "/inventory",
      text_position: "left",
      overlay_strength: "dark",
      focal_point: "right",
    },
  },
  {
    photo: {
      id: "PoMtjA7m_RI",
      raw: "https://images.unsplash.com/photo-1654641325054-1dfbfcb4d3f7",
    },
    mobileCenter: 0.42,
    desktopCenterY: 1,
    data: {
      headline: "Find your next SUV",
      button_label: "See SUVs",
      // The inventory filter parameter is `body`.
      button_link: "/inventory?body=suv",
      text_position: "left",
      overlay_strength: "dark",
      focal_point: "center",
    },
  },
  {
    photo: {
      id: "Be9l24zYaa4",
      raw: "https://images.unsplash.com/photo-1607507041354-b8d23042dc51",
    },
    mobileCenter: 0.5,
    desktopCenterY: 0.5,
    data: {
      headline: "Call or text, we answer fast",
      button_label: "Call us",
      button_link: "", // tel: + the phone number from site_settings.
      text_position: "left",
      overlay_strength: "light",
      focal_point: "center",
    },
  },
];

// ------------------------------------------------------------------ helpers

/** VIN with a correct check digit (position 9). */
function vin(prefix: string, suffix: string) {
  const values: Record<string, number> = {};
  "ABCDEFGH".split("").forEach((c, i) => (values[c] = i + 1));
  "JKLMN".split("").forEach((c, i) => (values[c] = i + 1));
  values.P = 7;
  values.R = 9;
  "STUVWXYZ".split("").forEach((c, i) => (values[c] = i + 2));
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const chars = `${prefix}0${suffix}`.split("");
  const sum = chars.reduce(
    (total, c, i) => total + (/\d/.test(c) ? +c : values[c]) * weights[i],
    0,
  );
  const check = sum % 11 === 10 ? "X" : String(sum % 11);
  const result = `${prefix}${check}${suffix}`;
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(result)) throw new Error(`Bad VIN ${result}`);
  return result;
}

async function download(photo: Photo, width: number) {
  const res = await fetch(`${photo.raw}?w=${width}&q=90&fm=jpg`);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for Unsplash photo ${photo.id}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Re-encode to WebP (no metadata) and upload; returns the stored size. */
async function upload(
  supabase: Admin,
  bucket: string,
  path: string,
  image: ReturnType<typeof sharp>,
): Promise<{ width: number; height: number }> {
  const { data, info } = await image.webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, data, { contentType: "image/webp", upsert: false });
  if (error) throw error;
  return { width: info.width, height: info.height };
}

// ------------------------------------------------------------------ main

async function seedVehicles(supabase: Admin) {
  await removeDemoVehicles(supabase);

  for (const v of VEHICLES) {
    const { data: row, error } = await supabase
      .from("vehicles")
      .insert({
        ...v.data,
        stock_no: v.stock_no,
        vin: vin(v.vinPrefix, v.vinSuffix),
        is_demo: true,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) throw error;

    for (const [index, photo] of v.photos.entries()) {
      const source = await download(photo, 2400);
      const path = `${row.id}/${crypto.randomUUID()}.webp`;
      const size = await upload(
        supabase,
        "vehicle-photos",
        path,
        sharp(source).rotate().resize(1920, 1920, { fit: "inside", withoutEnlargement: true }),
      );
      const { error: photoError } = await supabase
        .from("vehicle_photos")
        .insert({ vehicle_id: row.id, storage_path: path, sort_order: index, ...size });
      if (photoError) throw photoError;
    }

    // Publish once the photos are in (listed cars need at least one).
    const { error: publishError } = await supabase
      .from("vehicles")
      .update({ status: "available" })
      .eq("id", row.id);
    if (publishError) throw publishError;
    console.log(
      `Added ${v.stock_no} ${v.data.year} ${v.data.make} ${v.data.model} (${v.photos.length} photos)`,
    );
  }
}

async function seedSlides(supabase: Admin) {
  const { data: settings, error: settingsError } = await supabase
    .from("site_settings")
    .select("phone")
    .single();
  if (settingsError) throw settingsError;
  const digits = settings.phone?.replace(/\D/g, "") ?? "";
  const tel = digits.length === 10 ? `tel:+1${digits}` : digits ? `tel:+${digits}` : null;

  const { data: existing, error } = await supabase
    .from("hero_slides")
    .select("headline, sort_order");
  if (error) throw error;
  let sortOrder = Math.max(-1, ...existing.map((s) => s.sort_order)) + 1;

  for (const slide of SLIDES) {
    if (existing.some((s) => s.headline === slide.data.headline)) {
      console.log(`Slide "${slide.data.headline}" already exists; skipped.`);
      continue;
    }
    const buttonLink = slide.data.button_link || tel;
    const source = await download(slide.photo, 3200);
    const meta = await sharp(source).metadata();
    if ((meta.width ?? 0) < 2400) throw new Error(`Photo ${slide.photo.id} is under 2400px wide.`);

    // Desktop: 2400×1100 (the hero is wide), cropped around desktopCenterY.
    const { data: wide, info: wideInfo } = await sharp(source)
      .rotate()
      .resize({ width: 2400 })
      .toBuffer({ resolveWithObject: true });
    const cropHeight = Math.min(1100, wideInfo.height);
    const top = Math.min(
      wideInfo.height - cropHeight,
      Math.max(0, Math.round(wideInfo.height * slide.desktopCenterY - cropHeight / 2)),
    );
    const desktopPath = `slides/${crypto.randomUUID()}.webp`;
    const desktop = await upload(
      supabase,
      "site-images",
      desktopPath,
      sharp(wide).extract({ left: 0, top, width: 2400, height: cropHeight }),
    );

    // Phone: 1080×1350 crop around the car.
    const { data: tall, info } = await sharp(source)
      .rotate()
      .resize({ height: 1350 })
      .toBuffer({ resolveWithObject: true });
    const left = Math.min(
      info.width - 1080,
      Math.max(0, Math.round(info.width * slide.mobileCenter - 540)),
    );
    const mobilePath = `slides/${crypto.randomUUID()}.webp`;
    const mobile = await upload(
      supabase,
      "site-images",
      mobilePath,
      sharp(tall).extract({ left, top: 0, width: 1080, height: 1350 }),
    );

    const { error: insertError } = await supabase.from("hero_slides").insert({
      ...slide.data,
      button_label: buttonLink ? slide.data.button_label : null,
      button_link: buttonLink,
      image_path: desktopPath,
      image_width: desktop.width,
      image_height: desktop.height,
      mobile_image_path: mobilePath,
      mobile_image_width: mobile.width,
      mobile_image_height: mobile.height,
      sort_order: sortOrder++,
    });
    if (insertError) throw insertError;
    console.log(`Added slide "${slide.data.headline}"`);
  }
}

async function main() {
  const supabase = adminClient();
  await seedVehicles(supabase);
  await seedSlides(supabase);
  console.log("Done. Public pages refresh within 5 minutes (instantly in `pnpm dev`).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
