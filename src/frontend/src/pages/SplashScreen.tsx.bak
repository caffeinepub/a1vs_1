import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

type SplashPhase = "animating" | "portal";

export default function SplashScreen() {
  const navigate = useNavigate();

  // Skip animation if already shown this session
  const alreadyShown = sessionStorage.getItem("a1vs_splash_shown") === "true";
  const [phase, setPhase] = useState<SplashPhase>(
    alreadyShown ? "portal" : "animating",
  );

  // Logo and text reveal states (only used during animating phase)
  const [showLogo, setShowLogo] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showVersion, setShowVersion] = useState(false);

  useEffect(() => {
    if (alreadyShown) return;

    // Sequence the reveal
    const t1 = setTimeout(() => setShowLogo(true), 100);
    const t2 = setTimeout(() => setShowTitle(true), 900);
    const t3 = setTimeout(() => setShowSubtitle(true), 1200);
    const t4 = setTimeout(() => setShowVersion(true), 1400);
    const t5 = setTimeout(() => {
      sessionStorage.setItem("a1vs_splash_shown", "true");
      setPhase("portal");
    }, 2500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [alreadyShown]);

  const handleCustomerLogin = () => {
    navigate({ to: "/login" });
  };

  const handleAdminPortal = () => {
    navigate({ to: "/admin/login" });
  };

  const handleRiderLogin = () => {
    navigate({ to: "/admin/login" });
  };

  return (
    <div
      data-ocid="splash.section"
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.18 0.08 148) 0%, oklch(0.12 0.06 148) 100%)",
      }}
    >
      {/* Floating decorative background bubbles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="animate-float-bubble absolute rounded-full"
          style={{
            width: "420px",
            height: "420px",
            top: "-80px",
            left: "-100px",
            background: "oklch(0.55 0.18 148 / 0.06)",
            animationDelay: "0s",
            animationDuration: "8s",
          }}
        />
        <div
          className="animate-float-bubble absolute rounded-full"
          style={{
            width: "300px",
            height: "300px",
            bottom: "60px",
            right: "-60px",
            background: "oklch(0.65 0.2 148 / 0.07)",
            animationDelay: "2s",
            animationDuration: "7s",
          }}
        />
        <div
          className="animate-float-bubble absolute rounded-full"
          style={{
            width: "200px",
            height: "200px",
            top: "40%",
            right: "15%",
            background: "oklch(0.50 0.15 148 / 0.05)",
            animationDelay: "4s",
            animationDuration: "9s",
          }}
        />
        <div
          className="animate-float-bubble absolute rounded-full"
          style={{
            width: "150px",
            height: "150px",
            bottom: "25%",
            left: "10%",
            background: "oklch(0.60 0.18 148 / 0.05)",
            animationDelay: "1s",
            animationDuration: "6s",
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 w-full max-w-sm">
        {/* Logo */}
        <div
          className={`transition-all duration-100 ${
            phase === "animating" && showLogo
              ? "animate-logo-zoom"
              : phase === "animating" && !showLogo
                ? "opacity-0 scale-[0.05]"
                : "opacity-100 scale-100"
          }`}
          style={{
            filter:
              "drop-shadow(0 0 40px oklch(0.65 0.2 148 / 0.6)) drop-shadow(0 8px 32px rgba(0,0,0,0.4))",
          }}
        >
          <img
            src="/assets/generated/a1vs-logo-clean-transparent.dim_400x400.png"
            alt="A1VS Logo"
            className="w-40 h-40 object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        {/* Brand name */}
        {phase === "portal" ? (
          <h1 className="font-heading text-3xl font-bold text-white tracking-tight mt-4">
            A1VS
          </h1>
        ) : (
          <h1
            className="font-heading text-3xl font-bold text-white tracking-tight mt-4 transition-all duration-500"
            style={{
              opacity: showTitle ? 1 : 0,
              transform: showTitle ? "translateY(0)" : "translateY(8px)",
            }}
          >
            A1VS
          </h1>
        )}

        {/* Full form */}
        {phase === "portal" ? (
          <p className="text-white/60 text-xs tracking-widest uppercase mt-1 font-medium">
            AONE VEGETABLES &amp; SUPPLIER
          </p>
        ) : (
          <p
            className="text-white/60 text-xs tracking-widest uppercase mt-1 font-medium transition-all duration-500"
            style={{
              opacity: showSubtitle ? 1 : 0,
              transform: showSubtitle ? "translateY(0)" : "translateY(8px)",
            }}
          >
            AONE VEGETABLES &amp; SUPPLIER
          </p>
        )}

        {/* Version badge */}
        {phase === "portal" ? (
          <span className="mt-3 bg-white/10 text-white/50 text-xs px-3 py-1 rounded-full font-mono">
            v2.1.0
          </span>
        ) : (
          <span
            className="mt-3 bg-white/10 text-white/50 text-xs px-3 py-1 rounded-full font-mono transition-all duration-500"
            style={{
              opacity: showVersion ? 1 : 0,
              transform: showVersion ? "translateY(0)" : "translateY(8px)",
            }}
          >
            v2.1.0
          </span>
        )}

        {/* Portal selection buttons — appear after animation */}
        {phase === "portal" && (
          <div className="w-full mt-10 space-y-4">
            {/* Customer Login */}
            <button
              type="button"
              data-ocid="splash.customer_login.button"
              onClick={handleCustomerLogin}
              className="animate-fade-in-up w-full bg-white text-emerald-900 rounded-2xl py-5 text-lg font-semibold shadow-xl hover:scale-105 active:scale-95 transition-transform duration-200 flex items-center justify-center gap-3"
              style={{ animationDelay: "0s", animationFillMode: "forwards" }}
            >
              <span className="text-xl">👤</span>
              Customer Login
            </button>

            {/* Admin Portal */}
            <button
              type="button"
              data-ocid="splash.admin_portal.button"
              onClick={handleAdminPortal}
              className="animate-fade-in-up w-full rounded-2xl py-5 text-lg font-semibold shadow-xl hover:scale-105 active:scale-95 transition-transform duration-200 flex items-center justify-center gap-3 border-2 border-white/20 text-white"
              style={{
                animationDelay: "0.1s",
                animationFillMode: "forwards",
                background: "oklch(0.38 0.14 148 / 0.8)",
              }}
            >
              <span className="text-xl">🏢</span>
              Admin Portal
            </button>

            {/* Rider Login link */}
            <div
              className="animate-fade-in-up pt-2"
              style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
            >
              <button
                type="button"
                data-ocid="splash.rider_login.link"
                onClick={handleRiderLogin}
                className="text-white/50 text-sm underline underline-offset-2 hover:text-white/80 transition-colors"
              >
                🚚 Rider Login
              </button>
            </div>
          </div>
        )}

        {/* Loading indicator during animation */}
        {phase === "animating" && (
          <div className="mt-10 flex gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full bg-white/30"
              style={{ animation: "pulse 1.2s ease-in-out 0s infinite" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-white/30"
              style={{ animation: "pulse 1.2s ease-in-out 0.2s infinite" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-white/30"
              style={{ animation: "pulse 1.2s ease-in-out 0.4s infinite" }}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-white/30 text-xs">
          © {new Date().getFullYear()} A-One Vegetables &amp; Supplier
        </p>
      </div>
    </div>
  );
}
