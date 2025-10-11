import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

const Index = lazy(() => import("./pages/Index"));
const Scheduler = lazy(() => import("./pages/Scheduler"));
const Notes = lazy(() => import("./pages/Notes"));
const NoteEditor = lazy(() => import("./pages/NoteEditor"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));

const suspenseFallback = <div className="p-4 text-sm text-muted-foreground">Loading…</div>;

const AppRoutes = () => (
  <Suspense fallback={suspenseFallback}>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/scheduler" element={<Scheduler />} />
      <Route path="/notes" element={<Notes />} />
      <Route path="/notes/:id" element={<NoteEditor />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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
