import type { Metadata } from "next";
import { Toaster } from "sonner";

// Wraps every /admin page, including login. No auth check here — see
// (app)/layout.tsx and lib/auth.ts.
export const metadata: Metadata = {
  title: { default: "Staff", template: "%s | McRowin Auto staff" },
  robots: { index: false, follow: false },
};

export default function StaffRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      {children}
      <Toaster position="top-center" richColors closeButton />
    </>
  );
}
