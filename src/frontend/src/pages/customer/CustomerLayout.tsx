import { Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingBag,
  ClipboardList,
  FileBarChart,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { to: "/customer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/order", label: "Place New Order", icon: ShoppingBag },
  { to: "/customer/orders", label: "My Orders", icon: ClipboardList },
  { to: "/customer/statement", label: "My Statement", icon: FileBarChart },
];

export default function CustomerLayout() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const storeNumber = localStorage.getItem("a1vs_store_number") ?? "";
  const companyName = localStorage.getItem("a1vs_company_name") ?? "";

  const handleLogout = () => {
    localStorage.removeItem("a1vs_customer_token");
    localStorage.removeItem("a1vs_store_number");
    localStorage.removeItem("a1vs_company_name");
    localStorage.removeItem("a1vs_address");
    localStorage.removeItem("a1vs_gst_number");
    navigate({ to: "/" });
  };

  const isActive = (to: string) => {
    if (to === "/order") return currentPath === "/order" || currentPath.startsWith("/order/");
    return currentPath === to || currentPath.startsWith(to + "/");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo header */}
      <div className="px-4 py-4 border-b border-green-100">
        <div className="flex items-center gap-3">
          <img
            src="/assets/uploads/A-One-Vegetables-LOGO-1.png"
            alt="A1VS Logo"
            className="h-12 w-12 object-contain rounded-lg shrink-0"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.style.display = "none";
            }}
          />
          <div>
            <div className="font-heading font-bold text-base text-green-900 leading-none">A1VS</div>
            <div className="text-xs text-green-600 mt-0.5 leading-tight">AONE VEGETABLES</div>
            <div className="text-xs text-green-600 leading-tight">& SUPPLIER</div>
          </div>
        </div>
        {/* Store info */}
        <div className="mt-3 px-3 py-2 bg-green-50 rounded-lg">
          <p className="text-xs font-semibold text-green-800 truncate">{companyName}</p>
          <p className="text-xs text-green-600">Store #{storeNumber}</p>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={() => setMobileMenuOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
              isActive(to)
                ? "bg-green-600 text-white shadow-sm"
                : "text-green-800/70 hover:bg-green-50 hover:text-green-900"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom logout */}
      <div className="px-3 py-4 border-t border-green-100">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500/80 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "oklch(0.97 0.01 148)" }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-green-100 shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 cursor-default"
            onClick={() => setMobileMenuOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setMobileMenuOpen(false)}
            aria-label="Close sidebar"
          />
          <aside className="relative w-72 bg-white border-r border-green-100 flex flex-col z-10 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-green-100">
              <span className="font-heading font-bold text-green-900">Menu</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-md hover:bg-green-50 text-green-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="lg:hidden h-14 bg-white border-b border-green-100 flex items-center justify-between px-4 shrink-0 shadow-xs">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-md hover:bg-green-50 text-green-700"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src="/assets/uploads/A-One-Vegetables-LOGO-1.png"
              alt="A1VS"
              className="h-7 w-7 object-contain"
              onError={(e) => (e.currentTarget as HTMLImageElement).style.display = "none"}
            />
            <span className="font-heading font-bold text-green-900 text-sm">A1VS</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-1 text-xs"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6 max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center py-3 text-xs text-green-700/50 border-t border-green-100 bg-white shrink-0">
          © 2026. Built with ♥ using{" "}
          <a href="https://caffeine.ai" className="underline hover:text-green-800 transition-colors">
            caffeine.ai
          </a>
        </footer>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-green-100 flex z-40 shadow-lg">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors",
              isActive(to)
                ? "text-green-700"
                : "text-green-500/60 hover:text-green-700"
            )}
          >
            <Icon className={cn("w-5 h-5", isActive(to) ? "text-green-700" : "text-green-400")} />
            <span className="text-[10px] leading-none truncate">{label.split(" ")[0]}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
