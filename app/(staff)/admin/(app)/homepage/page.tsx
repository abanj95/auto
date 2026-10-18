import type { Metadata } from "next";

import { BrandImages } from "@/components/staff/homepage/brand-images";
import { CarouselSettingsForm } from "@/components/staff/homepage/carousel-settings-form";
import { HomepageSectionsForm } from "@/components/staff/homepage/homepage-sections-form";
import { SlidesSection } from "@/components/staff/homepage/slides-section";
import { slideStatus, type AdminSlide } from "@/components/staff/homepage/types";
import { requirePermission } from "@/lib/auth";
import { siteImageUrl } from "@/lib/site-images";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Homepage" };

export default async function HomepageEditorPage() {
  await requirePermission("homepage");
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

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-28">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Homepage</h1>
        <p className="text-sm text-muted-foreground">
          Hero slides, homepage sections, logo and site images. Previews show how the public site
          will look.
        </p>
      </div>

      <SlidesSection slides={adminSlides} />

      <CarouselSettingsForm
        initial={{
          hero_autoplay: s.hero_autoplay,
          hero_interval_seconds: s.hero_interval_seconds,
        }}
      />

      <HomepageSectionsForm
        initial={{
          home_welcome_subheading: s.home_welcome_subheading,
          tile_inventory_label: s.tile_inventory_label,
          tile_finder_label: s.tile_finder_label,
          tile_visit_label: s.tile_visit_label,
          tile_call_label: s.tile_call_label,
          show_featured_on_home: s.show_featured_on_home,
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
