import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed this session
    const dismissed = sessionStorage.getItem("a1vs_pwa_banner_dismissed");
    if (dismissed) return;

    // Don't show if already installed (standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem("a1vs_pwa_banner_dismissed", "1");
  };

  if (!showBanner) return null;

  return (
    <div
      data-ocid="pwa_install.banner"
      className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4"
      style={{ fontFamily: "inherit" }}
    >
      <div className="mx-auto max-w-lg bg-white rounded-2xl shadow-2xl border border-green-100 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden bg-green-50 flex items-center justify-center">
            <img
              src="/assets/generated/frontend/public/assets/generated/a1vs-icon-192.dim_192x192.png"
              alt="A1VS"
              className="w-9 h-9 object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-700 text-gray-900 leading-tight font-bold">
              Install A1VS
            </p>
            <p className="text-xs text-gray-500 leading-tight truncate">
              Add to home screen for quick access
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              data-ocid="pwa_install.primary_button"
              onClick={handleInstall}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Install
            </button>
            <button
              type="button"
              data-ocid="pwa_install.close_button"
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
