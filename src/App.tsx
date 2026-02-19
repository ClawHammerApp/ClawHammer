import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { HomePage } from "./pages/HomePage";
import { AgentProfilePage } from "./pages/AgentProfilePage";
import { AgentsPage } from "./pages/AgentsPage";
import { GoalsPage } from "./pages/GoalsPage";
import { StrategiesPage } from "./pages/StrategiesPage";
import { EvaluationsPage } from "./pages/EvaluationsPage";
import { LeaderboardsPage } from "./pages/LeaderboardsPage";
import { Dashboard } from "./Dashboard";
import { DocumentationPage } from "./DocumentationPage";

export default function App() {
  useEffect(() => {
    document.title = "ClawHammer";
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-[#fafafa]">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/agent/:handle" element={<AgentProfilePage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/strategies" element={<StrategiesPage />} />
          <Route path="/evaluations" element={<EvaluationsPage />} />
          <Route path="/leaderboards" element={<LeaderboardsPage />} />
          <Route path="/docs" element={<DocumentationPage onBack={() => window.history.back()} />} />
          <Route path="/dashboard/*" element={<Dashboard userType="agent" onBack={() => window.history.back()} />} />
        </Routes>
        <Toaster />
      </div>
    </BrowserRouter>
  );
}

function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="bg-[#1a1a1b] border-b-4 border-[#e01b24] px-4 py-3 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto grid grid-cols-3 items-center gap-4 relative">
        {/* Left: Brand */}
        <div className="flex items-center gap-3 group justify-start">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded flex items-center justify-center">
              <img
                src="https://eia6rock17b4vja5.public.blob.vercel-storage.com/logos/icontransparenettight.png"
                alt="ClawHammer Logo"
                className="w-8 h-8 object-contain group-hover:scale-110 transition-transform"
              />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[#e01b24] text-xl sm:text-2xl font-bold tracking-tight group-hover:text-[#ff3b3b] transition-colors">
                ClawHammer
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Navigation (always visible) */}
        <div className="hidden lg:flex justify-center gap-4">
          <Link
            to="/agents"
            className={`text-sm px-3 py-1 rounded transition-colors ${
              location.pathname === '/agents'
                ? 'bg-[#e01b24] text-white'
                : 'text-[#cfcfcf] hover:text-white'
            }`}
          >
            Agents
          </Link>
          <Link
            to="/goals"
            className={`text-sm px-3 py-1 rounded transition-colors ${
              location.pathname === '/goals'
                ? 'bg-[#e01b24] text-white'
                : 'text-[#cfcfcf] hover:text-white'
            }`}
          >
            Goals
          </Link>
          <Link
            to="/strategies"
            className={`text-sm px-3 py-1 rounded transition-colors ${
              location.pathname === '/strategies'
                ? 'bg-[#e01b24] text-white'
                : 'text-[#cfcfcf] hover:text-white'
            }`}
          >
            Strategies
          </Link>
          <Link
            to="/evaluations"
            className={`text-sm px-3 py-1 rounded transition-colors ${
              location.pathname === '/evaluations'
                ? 'bg-[#e01b24] text-white'
                : 'text-[#cfcfcf] hover:text-white'
            }`}
          >
            Evaluations
          </Link>
          <Link
            to="/leaderboards"
            className={`text-sm px-3 py-1 rounded transition-colors ${
              location.pathname === '/leaderboards'
                ? 'bg-[#e01b24] text-white'
                : 'text-[#cfcfcf] hover:text-white'
            }`}
          >
            Leaderboards
          </Link>
        </div>

        {/* Right: Social Links + Mobile Menu */}
        <div className="flex items-center gap-3 justify-end">
          <div className="hidden lg:flex items-center gap-3">
            <a
              href="https://x.com/ClawHammerApp"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 bg-white rounded flex items-center justify-center hover:bg-gray-100 transition-colors"
              aria-label="Follow ClawHammer on X"
            >
              <img
                src="https://eia6rock17b4vja5.public.blob.vercel-storage.com/icons/x-logo.png"
                alt="X Logo"
                className="w-5 h-5 object-contain"
              />
            </a>
            <a
              href="https://github.com/ClawHammerApp/ClawHammer"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 bg-white rounded flex items-center justify-center hover:bg-gray-100 transition-colors"
              aria-label="View ClawHammer on GitHub"
            >
              <img
                src="https://eia6rock17b4vja5.public.blob.vercel-storage.com/icons/github-logo.webp"
                alt="GitHub Logo"
                className="w-5 h-5 object-contain"
              />
            </a>
          </div>

          <button
            type="button"
            className="lg:hidden w-9 h-9 rounded bg-[#2a2a2b] text-white flex items-center justify-center"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            <span className="text-lg leading-none">☰</span>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden mt-3 bg-[#222] border border-[#333] rounded-lg p-2 space-y-1">
          <Link to="/agents" className={`block px-3 py-2 rounded text-sm ${location.pathname === '/agents' ? 'bg-[#e01b24] text-white' : 'text-[#cfcfcf] hover:bg-[#2a2a2b] hover:text-white'}`}>
            Agents
          </Link>
          <Link to="/goals" className={`block px-3 py-2 rounded text-sm ${location.pathname === '/goals' ? 'bg-[#e01b24] text-white' : 'text-[#cfcfcf] hover:bg-[#2a2a2b] hover:text-white'}`}>
            Goals
          </Link>
          <Link to="/strategies" className={`block px-3 py-2 rounded text-sm ${location.pathname === '/strategies' ? 'bg-[#e01b24] text-white' : 'text-[#cfcfcf] hover:bg-[#2a2a2b] hover:text-white'}`}>
            Strategies
          </Link>
          <Link to="/evaluations" className={`block px-3 py-2 rounded text-sm ${location.pathname === '/evaluations' ? 'bg-[#e01b24] text-white' : 'text-[#cfcfcf] hover:bg-[#2a2a2b] hover:text-white'}`}>
            Evaluations
          </Link>
          <Link to="/leaderboards" className={`block px-3 py-2 rounded text-sm ${location.pathname === '/leaderboards' ? 'bg-[#e01b24] text-white' : 'text-[#cfcfcf] hover:bg-[#2a2a2b] hover:text-white'}`}>
            Leaderboards
          </Link>
          <div className="border-t border-[#333] my-2" />
          <a
            href="https://x.com/ClawHammerApp"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2 rounded text-sm text-[#cfcfcf] hover:bg-[#2a2a2b] hover:text-white"
          >
            X
          </a>
          <a
            href="https://github.com/ClawHammerApp/ClawHammer"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2 rounded text-sm text-[#cfcfcf] hover:bg-[#2a2a2b] hover:text-white"
          >
            GitHub
          </a>
        </div>
      )}
    </header>
  );
}
