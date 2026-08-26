import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import PublicCityLayout from "@/components/PublicCityLayout";
import { trpc } from "@/lib/trpc";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Compare from "./pages/Compare";
import DataEntry from "./pages/DataEntry";
import Forecast from "./pages/Forecast";
import HistoricalArchive from "./pages/HistoricalArchive";
import Home from "./pages/Home";
import Imports from "./pages/Imports";
import Indicators from "./pages/Indicators";
import NotFound from "./pages/NotFound";
import Reports from "./pages/Reports";
import PublicationHub from "./pages/PublicationHub";
import PublicationShowcase from "./pages/PublicationShowcase";
import SpatialExplorer from "./pages/SpatialExplorer";
import SpatialManagement from "./pages/SpatialManagement";
import SpatialDetail from "./pages/SpatialDetail";
import Users from "./pages/Users";
import SecurityReview from "./pages/SecurityReview";
import HelpSupport from "./pages/HelpSupport";
import SupportAdmin from "./pages/SupportAdmin";
import { Route, Switch } from "wouter";

function ProtectedPage({ children }: { children: React.ReactNode }) { return <DashboardLayout>{children}</DashboardLayout>; }
function PublicCityPage({ children }: { children: React.ReactNode }) {
  const { data: viewer } = trpc.auth.viewer.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  return viewer ? <DashboardLayout>{children}</DashboardLayout> : <PublicCityLayout>{children}</PublicCityLayout>;
}

function Router() {
  return <Switch>
    <Route path="/"><ProtectedPage><Home /></ProtectedPage></Route>
    <Route path="/indicators"><ProtectedPage><Indicators /></ProtectedPage></Route>
    <Route path="/data"><ProtectedPage><DataEntry /></ProtectedPage></Route>
    <Route path="/data-entry"><ProtectedPage><DataEntry /></ProtectedPage></Route>
    <Route path="/forecast"><ProtectedPage><Forecast /></ProtectedPage></Route>
    <Route path="/archive"><ProtectedPage><HistoricalArchive /></ProtectedPage></Route>
    <Route path="/spatial"><PublicCityPage><SpatialExplorer /></PublicCityPage></Route>
    <Route path="/spatial/:areaId"><PublicCityPage><SpatialDetail /></PublicCityPage></Route>
    <Route path="/spatial-management"><ProtectedPage><SpatialManagement /></ProtectedPage></Route>
    <Route path="/compare"><ProtectedPage><Compare /></ProtectedPage></Route>
    <Route path="/imports"><ProtectedPage><Imports /></ProtectedPage></Route>
    <Route path="/reports"><ProtectedPage><Reports /></ProtectedPage></Route>
    <Route path="/publication"><ProtectedPage><PublicationHub /></ProtectedPage></Route>
    <Route path="/data-showcase"><PublicCityPage><PublicationShowcase /></PublicCityPage></Route>
    <Route path="/users"><ProtectedPage><Users /></ProtectedPage></Route>
    <Route path="/security"><ProtectedPage><SecurityReview /></ProtectedPage></Route>
    <Route path="/help"><ProtectedPage><HelpSupport /></ProtectedPage></Route>
    <Route path="/support-admin"><ProtectedPage><SupportAdmin /></ProtectedPage></Route>
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors position="top-center" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
