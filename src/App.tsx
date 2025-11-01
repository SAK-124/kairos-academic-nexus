import { Suspense, lazy, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { useAuth } from "@/hooks/useAuth";

const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Scheduler = lazy(() => import("./pages/Scheduler"));
const Notes = lazy(() => import("./pages/Notes"));
const NoteEditor = lazy(() => import("./pages/NoteEditor"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));

const suspenseFallback = <div className="p-4 text-sm text-muted-foreground">Loading…</div>;

const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => {
  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 flex items-center justify-between border-b px-4 bg-surface-container shadow-[var(--elevation-1)]">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <div className="hidden sm:block">
                  <h1 className="text-lg font-semibold text-foreground">Kairos</h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <UserMenu onAdminClick={() => setShowAdmin(true)} />
              </div>
            </header>
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </div>
      </SidebarProvider>
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </>
  );
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) return suspenseFallback;

  return (
    <Suspense fallback={suspenseFallback}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Index />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/contact" element={<Contact />} />
        
        {/* Authenticated Routes with Sidebar */}
        {user ? (
          <>
            <Route path="/dashboard" element={<AuthenticatedLayout><Dashboard /></AuthenticatedLayout>} />
            <Route path="/notes" element={<AuthenticatedLayout><Notes /></AuthenticatedLayout>} />
            <Route path="/notes/:id" element={<AuthenticatedLayout><NoteEditor /></AuthenticatedLayout>} />
            <Route path="/scheduler" element={<AuthenticatedLayout><Scheduler /></AuthenticatedLayout>} />
            <Route path="/scheduler/:scheduleId" element={<AuthenticatedLayout><Scheduler /></AuthenticatedLayout>} />
            <Route path="/settings" element={<Navigate to="/dashboard" replace />} />
          </>
        ) : (
          <>
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/notes" element={<Navigate to="/" replace />} />
            <Route path="/scheduler" element={<Navigate to="/" replace />} />
            <Route path="/settings" element={<Navigate to="/" replace />} />
          </>
        )}
        
        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <TooltipProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <Toaster />
      <Sonner />
    </TooltipProvider>
  </ThemeProvider>
);

export default App;
