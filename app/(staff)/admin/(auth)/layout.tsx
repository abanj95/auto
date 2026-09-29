import { Logo } from "@/components/public/logo";

// Centered card layout for login, forgot password and reset password.
export default function AuthLayout({ children }: LayoutProps<"/admin">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <Logo className="mb-6 h-9" />
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
