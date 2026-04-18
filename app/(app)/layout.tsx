import Sidebar from "@/components/layout/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Sidebar />
      <main className="lg:ml-[220px] min-h-screen pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto px-4 py-5 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
