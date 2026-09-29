import type { Metadata } from "next";

import { BrandImages } from "@/components/staff/homepage/brand-images";
import { CarouselSettingsForm } from "@/components/staff/homepage/carousel-settings-form";
import { SlidesSection } from "@/components/staff/homepage/slides-section";
import { slideStatus, type AdminSlide } from "@/components/staff/homepage/types";
import { requireAdmin } from "@/lib/auth";
import { siteImageUrl } from "@/lib/site-images";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Homepage" };

export default async function HomepageEditorPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: slides, error }, { data: s, error: settingsError }] = await Promise.all([
    supabase.from("hero_slides").select("*").order("sort_order").order("created_at"),
    supabase.from("site_settings").select("*").single(),
  ]);
  if (error) throw error;
  if (settingsError) throw settingsError;

  const adminSlides: AdminSlide[] = slides.map((slide) => ({
    ...slide,
    src: siteImageUrl(slide.image_path),
    mobileSrc: siteImageUrl(slide.mobile_image_path),
    status: slideStatus(slide),
  }));

  const eyebrow = `${s.dealership_name} · ${s.city ?? "your area"}`;

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-28">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Homepage</h1>
        <p className="text-sm text-muted-foreground">
          Hero slides, logo and site images. Previews show how the public site will look.
        </p>
      </div>

      <SlidesSection slides={adminSlides} eyebrow={eyebrow} />

      <CarouselSettingsForm
        initial={{
          hero_autoplay: s.hero_autoplay,
          hero_interval_seconds: s.hero_interval_seconds,
        }}
      />

      <BrandImages
        paths={{
          logo_path: s.logo_path,
          logo_dark_path: s.logo_dark_path,
          favicon_path: s.favicon_path,
          about_image_path: s.about_image_path,
          og_default_image_path: s.og_default_image_path,
        }}
      />
    </div>
  );
}
