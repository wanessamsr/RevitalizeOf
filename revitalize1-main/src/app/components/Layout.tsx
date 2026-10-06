import { Outlet, Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileText,
  Palette,
  UsersRound,
  BarChart3,
  CalendarX,
  ArrowRightLeft,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Calendar,
  FolderOpen
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import logoLight from "../../imports/Logos_Revitalize.png";
import logoDark from "../../imports/Logos_Revitalize_(1).png";

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  // Sidebar is always dark blue, so we always use the light/white logo version (logoDark)
  const sidebarLogo = logoDark;
  const logo = theme === "dark" ? logoDark : logoLight;

  const navigation = [
    { name: "Painel de Indicadores", href: "/dashboard", icon: LayoutDashboard },
    { name: "Agenda", href: "/schedule", icon: Calendar },
    { name: "Prontuários", href: "/medical-records", icon: FolderOpen },
    { name: "Pacientes", href: "/patients", icon: Users },
    { name: "Acolhimento", href: "/admission", icon: UserPlus },
    { name: "Oficinas Terapêuticas", href: "/workshops", icon: Palette },
    { name: "Atendimento em Grupo", href: "/group-session", icon: UsersRound },
    { name: "Produção Diária", href: "/daily-production", icon: BarChart3 },
    { name: "Gestão de Faltas", href: "/absences", icon: CalendarX },
    { name: "Encaminhamentos", href: "/referrals", icon: ArrowRightLeft },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-sidebar border-r border-sidebar-border">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <img src={sidebarLogo} alt="Revitalize" className="h-12" />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all">
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
            <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border">
              <img src={sidebarLogo} alt="Revitalize" className="h-12" />
              <button onClick={() => setSidebarOpen(false)} className="text-sidebar-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t border-sidebar-border">
              <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all">
                <LogOut className="w-5 h-5" />
                <span className="text-sm">Sair</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-foreground"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground transition-all"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">Dr. João Silva</p>
              <p className="text-xs text-muted-foreground">Médico Psiquiatra</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
              JS
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
