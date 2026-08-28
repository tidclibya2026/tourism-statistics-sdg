import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import PublicCityLayout from "@/components/PublicCityLayout";
import { trpc } from "@/lib/trpc";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AccessibilityProvider } from "./contexts/AccessibilityContext";
import NotFound from "./pages/NotFound";
import { Route, Switch } from "wouter";

const Compare = lazy(() => import("./pages/Compare"));
const DataEntry = lazy(() => import("./pages/DataEntry"));
const DocumentAudit = lazy(() => import("./pages/DocumentAudit"));
const Documents = lazy(() => import("./pages/Documents"));
const Forecast = lazy(() => import("./pages/Forecast"));
const HelpSupport = lazy(() => import("./pages/HelpSupport"));
const HistoricalArchive = lazy(() => import("./pages/HistoricalArchive"));
const Home = lazy(() => import("./pages/Home"));
const Imports = lazy(() => import("./pages/Imports"));
const Indicators = lazy(() => import("./pages/Indicators"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicationHub = lazy(() => import("./pages/PublicationHub"));
const PublicationShowcase = lazy(() => import("./pages/PublicationShowcase"));
const Reports = lazy(() => import("./pages/Reports"));
const SecurityReview = lazy(() => import("./pages/SecurityReview"));
const SpatialDetail = lazy(() => import("./pages/SpatialDetail"));
const SpatialExplorer = lazy(() => import("./pages/SpatialExplorer"));
const SpatialManagement = lazy(() => import("./pages/SpatialManagement"));
const SupportAdmin = lazy(() => import("./pages/SupportAdmin"));
const Users = lazy(() => import("./pages/Users"));

function PageLoading() {
  return (
    <div
      className="grid min-h-[50vh] place-items-center"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-semibold text-muted-foreground">
        جارٍ تحميل الصفحة…
      </p>
    </div>
  );
}

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
function PublicCityPage({ children }: { children: React.ReactNode }) {
  const { data: viewer } = trpc.auth.viewer.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  return viewer ? (
    <DashboardLayout>{children}</DashboardLayout>
  ) : (
    <PublicCityLayout>{children}</PublicCityLayout>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Switch>
        <Route path="/">
          <ProtectedPage>
            <Home />
          </ProtectedPage>
        </Route>
        <Route path="/indicators">
          <ProtectedPage>
            <Indicators />
          </ProtectedPage>
        </Route>
        <Route path="/data">
          <ProtectedPage>
            <DataEntry />
          </ProtectedPage>
        </Route>
        <Route path="/data-entry">
          <ProtectedPage>
            <DataEntry />
          </ProtectedPage>
        </Route>
        <Route path="/forecast">
          <ProtectedPage>
            <Forecast />
          </ProtectedPage>
        </Route>
        <Route path="/archive">
          <ProtectedPage>
            <HistoricalArchive />
          </ProtectedPage>
        </Route>
        <Route path="/spatial">
          <PublicCityPage>
            <SpatialExplorer />
          </PublicCityPage>
        </Route>
        <Route path="/spatial/:areaId">
          <PublicCityPage>
            <SpatialDetail />
          </PublicCityPage>
        </Route>
        <Route path="/spatial-management">
          <ProtectedPage>
            <SpatialManagement />
          </ProtectedPage>
        </Route>
        <Route path="/compare">
          <ProtectedPage>
            <Compare />
          </ProtectedPage>
        </Route>
        <Route path="/imports">
          <ProtectedPage>
            <Imports />
          </ProtectedPage>
        </Route>
        <Route path="/reports">
          <ProtectedPage>
            <Reports />
          </ProtectedPage>
        </Route>
        <Route path="/publication">
          <ProtectedPage>
            <PublicationHub />
          </ProtectedPage>
        </Route>
        <Route path="/data-showcase">
          <PublicCityPage>
            <PublicationShowcase />
          </PublicCityPage>
        </Route>
        <Route path="/users">
          <ProtectedPage>
            <Users />
          </ProtectedPage>
        </Route>
        <Route path="/security">
          <ProtectedPage>
            <SecurityReview />
          </ProtectedPage>
        </Route>
        <Route path="/help">
          <ProtectedPage>
            <HelpSupport />
          </ProtectedPage>
        </Route>
        <Route path="/support-admin">
          <ProtectedPage>
            <SupportAdmin />
          </ProtectedPage>
        </Route>
        <Route path="/profile">
          <ProtectedPage>
            <Profile />
          </ProtectedPage>
        </Route>
        <Route path="/documents">
          <ProtectedPage>
            <Documents />
          </ProtectedPage>
        </Route>
        <Route path="/document-audit">
          <ProtectedPage>
            <DocumentAudit />
          </ProtectedPage>
        </Route>
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AccessibilityProvider>
        <ThemeProvider defaultTheme="light" switchable>
          <TooltipProvider>
            <Toaster richColors position="top-center" />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AccessibilityProvider>
    </ErrorBoundary>
  );
}
