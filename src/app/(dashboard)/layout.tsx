import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { PrivateRoute } from '@/components/common';
import { SidebarProvider } from '@/context/sidebar-context';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PrivateRoute>
      <SidebarProvider>
        <div className="flex h-screen flex-col md:flex-row md:overflow-hidden bg-[var(--background)]">
          <Sidebar />
          <div className="flex-1 flex flex-col h-screen overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto bg-[var(--content-bg)] p-6">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </PrivateRoute>
  );
}
