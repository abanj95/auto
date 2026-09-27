import Link from "next/link";

// Centered card layout for login, forgot password and reset password.
export default function AuthLayout({ children }: LayoutProps<"/admin">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <Link href="/" className="mb-6 text-xl font-bold tracking-tight">
        <span className="text-brand">McRowin</span> Auto
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
