import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Smartphone,
  WifiOff,
  X,
} from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'sidebar',
}) => {
  const { isInstallable, isInstalled, isIOS, isInIframe, appUrl, install } =
    usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!showGuide || !appUrl) return;
    let active = true;
    QRCode.toDataURL(appUrl, {
      width: 160,
      margin: 2,
      color: { dark: '#0B0C0E', light: '#FFFFFF' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [showGuide, appUrl]);

  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Installed as Standalone Android / Device App</span>
        </div>
      );
    }
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  const handleCopyUrl = async () => {
    if (!appUrl) return;
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
    } catch {
      const el = document.createElement('textarea');
      el.value = appUrl;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
      setCopied(true);
    }
    window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <>
      {variant === 'header' ? (
        <button
          type="button"
          onClick={handleClick}
          aria-label="Install Android App"
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md border border-[#2C3140] bg-[#171A22] hover:bg-[#1F2430] text-xs font-medium text-zinc-100 transition-colors whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span className="hidden sm:inline">
            {isInstallable ? 'Install Now' : 'Install App'}
          </span>
          <span className="sm:hidden">Install</span>
        </button>
      ) : variant === 'sidebar' ? (
        <button
          type="button"
          onClick={handleClick}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-amber-500/35 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-medium text-amber-300 transition-colors whitespace-nowrap"
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span>{isInstallable ? 'Install Android App' : 'Get Android App'}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-amber-500 hover:bg-amber-400 text-[#0B0C0E] text-xs font-semibold transition-colors whitespace-nowrap"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>{isInstallable ? 'Install on Android Now' : 'Install on Android'}</span>
        </button>
      )}

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="android-install-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75"
        >
          <div className="w-full max-w-lg max-h-[90dvh] flex flex-col rounded-lg border border-[#282D3A] bg-[#12141A] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#23262E] shrink-0">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                <h2
                  id="android-install-title"
                  className="font-display text-base font-semibold text-zinc-100"
                >
                  {isIOS ? 'Install on iPhone / iPad' : 'Install LumaVault on Android'}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close install instructions"
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-[#1D212A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-zinc-300 leading-relaxed overflow-y-auto">
              {isInIframe && (
                <div className="p-3 rounded-md border border-amber-500/35 bg-amber-500/10 text-amber-200 leading-relaxed">
                  <strong className="font-semibold text-amber-100">
                    Why there is no install button inside AI Studio:
                  </strong>{' '}
                  Browsers block app installation inside embedded preview frames.
                  Scan the QR code below with your Android phone or open the direct
                  link in Chrome to install.
                </div>
              )}

              {appUrl && (
                <div className="p-3.5 rounded-md border border-[#23262E] bg-[#0E1015] flex flex-col sm:flex-row items-center gap-4">
                  {qrDataUrl && (
                    <div className="p-1.5 rounded-md bg-white shrink-0">
                      <img
                        src={qrDataUrl}
                        alt="QR code to open LumaVault Studio on your Android phone"
                        className="w-28 h-28 block"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-2.5 w-full">
                    <div>
                      <p className="font-medium text-zinc-100">
                        Open Directly on Android Chrome
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Point your Android camera at the QR code, or copy and open this standalone link:
                      </p>
                    </div>
                    <div className="px-2.5 py-1.5 rounded bg-[#161922] border border-[#262B36] font-mono-tabular text-[11px] text-zinc-200 truncate">
                      {appUrl}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1D212A] hover:bg-[#262C38] border border-[#2F3545] text-zinc-100 text-xs font-medium transition-colors"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copied Link</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Copy App Link</span>
                          </>
                        )}
                      </button>
                      <a
                        href={appUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-[#0B0C0E] text-xs font-semibold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Standalone Tab</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {isIOS ? (
                <ol className="space-y-2 list-decimal list-inside">
                  <li>
                    Open the standalone link above in <strong>Safari</strong>.
                  </li>
                  <li>
                    Tap the <strong>Share</strong> icon in the Safari toolbar.
                  </li>
                  <li>
                    Tap <strong>Add to Home Screen</strong> to run offline full-screen.
                  </li>
                </ol>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="font-medium text-zinc-100">
                      Steps Once Opened in Chrome on Android
                    </p>
                    <ol className="space-y-1.5 list-decimal list-inside text-zinc-400">
                      <li>
                        Open the direct app link in <strong>Chrome on Android</strong>{' '}
                        (or tap <strong>Open Standalone Tab</strong> above if you are already on your phone).
                      </li>
                      <li>
                        Tap <strong className="text-zinc-200">Install App</strong> in the top bar, or tap Chrome&apos;s top-right menu (<strong>⋮</strong>) →{' '}
                        <strong className="text-zinc-200">Install app</strong> /{' '}
                        <strong className="text-zinc-200">Add to Home screen</strong>.
                      </li>
                      <li>
                        Launch <strong>LumaVault</strong> from your Android home screen — runs full-screen with 100% offline caching.
                      </li>
                    </ol>
                  </div>

                  <div className="pt-3 border-t border-[#23262E] space-y-1.5">
                    <p className="font-medium text-zinc-100">
                      Want a Native Android APK File?
                    </p>
                    <p className="text-zinc-400">
                      Export this project from AI Studio (includes{' '}
                      <span className="font-mono-tabular text-zinc-200">
                        capacitor.config.json
                      </span>
                      ) and build an APK in Android Studio:
                    </p>
                    <pre className="p-2.5 rounded bg-[#0B0C0E] border border-[#23262E] font-mono-tabular text-[11px] text-amber-300 overflow-x-auto">
{`npm install && npm run build
npx cap add android
npx cap open android`}
                    </pre>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end px-5 py-3.5 border-t border-[#23262E] bg-[#0F1116] shrink-0">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-[#0B0C0E] text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineStatusBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="px-4 py-1.5 bg-[#181B22] border-b border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline Mode Active — All AI editing tools and saved projects remain fully available.</span>
    </div>
  );
};
