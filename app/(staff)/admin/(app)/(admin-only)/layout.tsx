import { requireAdmin } from "@/lib/auth";

// Admin-only section. New staff pages go in this group unless posters need
// them. Pages here must also call requireAdmin() themselves.
export default async function AdminOnlyLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return children;
}
