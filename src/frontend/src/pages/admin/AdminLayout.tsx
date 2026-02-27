import { Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  UserCog,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  BarChart3,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/orders", label: "Orders / PO", icon: ShoppingCart },
  { to: "/admin/accounts", label: "Accounts", icon: BarChart3 },
  { to: "/admin/users", label: "Users", icon: UserCog },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/profile", label: "Profile", icon: UserCircle },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("a1vs_admin_token");
    localStorage.removeItem("a1vs_admin_role");
    navigate({ to: "/admin/login" });
  };

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return currentPath === to;
    return currentPath.startsWith(to);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img
            src="/assets/uploads/A-One-Vegetables-LOGO-1.png"
            alt="A1VS Logo"
            className="h-12 w-12 object-contain rounded-lg shrink-0"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.style.display = "none";
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = "flex";
            }}
          />
          <div
            className="w-12 h-12 rounded-lg bg-primary items-center justify-center text-primary-foreground font-bold text-lg hidden"
          >
            A
          </div>
          <div>
            <div className="font-heading font-bold text-base text-sidebar-foreground leading-none">A1VS</div>
            <div className="text-xs text-sidebar-foreground/50 mt-0.5 leading-tight">AONE VEGETABLES</div>
            <div className="text-xs text-sidebar-foreground/50 leading-tight">& SUPPLIER</div>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
              isActive(to, exact)
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
        >
          <ExternalLink className="w-4 h-4 shrink-0" />
          Open Customer Portal
        </a>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-muted/30 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-sidebar border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 cursor-default"
            onClick={() => setSidebarOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setSidebarOpen(false)}
            aria-label="Close sidebar"
          />
          <aside className="relative w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0 shadow-xs">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="hidden lg:block font-heading font-semibold text-sm text-muted-foreground">
            {navItems.find(({ to, exact }) => isActive(to, exact))?.label ?? "Admin Portal"}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
