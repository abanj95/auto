-- Public contact email shown on the Contact page and footer.
alter table public.site_settings
  add column email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
