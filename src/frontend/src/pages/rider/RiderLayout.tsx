import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { LogOut, Truck } from "lucide-react";

export default function RiderLayout() {
  const navigate = useNavigate();
  const riderName = localStorage.getItem("a1vs_rider_name") ?? "Rider";
  const riderPhone = localStorage.getItem("a1vs_rider_phone") ?? "";

  const handleLogout = () => {
    localStorage.removeItem("a1vs_rider_token");
    localStorage.removeItem("a1vs_rider_email");
    localStorage.removeItem("a1vs_rider_name");
    localStorage.removeItem("a1vs_rider_phone");
    localStorage.removeItem("a1vs_rider_role");
    navigate({ to: "/admin/login" });
  };

  return (
    <div className="min-h-screen bg-rider-bg flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-indigo-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-indigo-900 text-sm leading-none">
                  {riderName}
                </span>
                <Badge className="bg-indigo-100 text-indigo-700 border-0 text-[10px] px-1.5 py-0">
                  Rider
                </Badge>
              </div>
              {riderPhone && (
                <p className="text-[10px] text-indigo-500 mt-0.5 font-mono">
                  {riderPhone}
                </p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleLogout}
            className="gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 h-8"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4">
        <Outlet />
      </main>
    </div>
  );
}
