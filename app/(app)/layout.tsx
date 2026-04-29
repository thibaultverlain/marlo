import Sidebar from "@/components/layout/sidebar";
import { getAuthContext } from "@/lib/auth/require-role";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let role = "owner";
  try {
    const ctx = await getAuthContext();
    role = ctx.role;
  } catch {}

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Sidebar role={role} />
      <main className="lg:ml-[220px] min-h-screen pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto px-4 py-5 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
