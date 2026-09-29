-- Demo listings, phone-sized hero images and tel: slide buttons.

-- Demo vehicles (scripts/seed-demo.ts) show a "Demo listing" badge and are
-- removed before launch by scripts/remove-demo.ts.
alter table public.vehicles
  add column is_demo boolean not null default false;

-- Optional portrait image used below 768px; otherwise the desktop image is
-- cropped around focal_point.
alter table public.hero_slides
  add column mobile_image_path text check (length(mobile_image_path) <= 300),
  add column mobile_image_width integer check (mobile_image_width > 0),
  add column mobile_image_height integer check (mobile_image_height > 0),
  add column focal_point text not null default 'center'
    check (focal_point in ('left', 'center', 'right')),
  add constraint hero_slides_mobile_image_complete check (
    (mobile_image_path is null)
    = (mobile_image_width is null)
    and (mobile_image_path is null) = (mobile_image_height is null)
  );

-- Buttons may also call the dealership: tel:+12156182789.
alter table public.hero_slides drop constraint hero_slides_button_link_check;
alter table public.hero_slides add constraint hero_slides_button_link_check check (
  length(button_link) <= 300
  and (button_link ~ '^/([^/\\]|$)' or button_link ~ '^tel:\+?[0-9]{7,15}$')
);

-- The original seed slide pointed at public/hero.jpg, which is being removed.
delete from public.hero_slides where image_path = '/hero.jpg';
