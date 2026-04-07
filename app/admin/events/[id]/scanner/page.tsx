"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft, Wifi, WifiOff, Camera } from "lucide-react";

interface ScanResult {
  type: "success" | "duplicate" | "error";
  message: string;
  participantName?: string;
  guests?: number;
  checkedInAt?: string;
}

interface OfflineScan {
  token: string;
  scannedAt: string;
  synced: boolean;
}

const OFFLINE_QUEUE_KEY = "checkin_offline_queue";

function loadOfflineQueue(): OfflineScan[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: OfflineScan[]) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

function formatTime(iso?: string | null) {
  if (!iso) return "–";
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export default function ScannerPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const router = useRouter();

  const qrRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string>("");
  const cooldownRef = useRef(false);
  // Stable ref so the scanner callback never captures a stale closure
  const handleScanRef = useRef<(text: string) => void>(() => {});

  const [cameraState, setCameraState] = useState<"starting" | "scanning" | "error">("starting");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Explicitly stops the camera — used both in cleanup and before navigation
  const stopCamera = useCallback(async () => {
    // 1. Directly stop all video tracks (immediate — turns off camera LED right away)
    document.querySelectorAll<HTMLVideoElement>("#qr-reader video").forEach((video) => {
      const stream = video.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    });
    // 2. Let html5-qrcode clean up its own state
    try {
      if (qrRef.current?.isScanning) await qrRef.current.stop();
      qrRef.current?.clear();
    } catch { /* ignore */ }
  }, []);

  const navigateTo = useCallback(async (href: string) => {
    await stopCamera();
    router.push(href);
  }, [stopCamera, router]);

  // ── Online tracking ──────────────────────────────────────
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    setIsOnline(navigator.onLine);
    setOfflineCount(loadOfflineQueue().filter((s) => !s.synced).length);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // ── Offline sync ─────────────────────────────────────────
  const syncOfflineQueue = useCallback(async () => {
    const queue = loadOfflineQueue();
    const pending = queue.filter((s) => !s.synced);
    if (pending.length === 0) return;

    setSyncing(true);
    let synced = 0;
    for (const scan of pending) {
      try {
        const res = await fetch("/api/checkin/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: scan.token }),
        });
        if (res.ok) { scan.synced = true; synced++; }
      } catch { /* keep unsynced */ }
    }
    saveOfflineQueue(queue);
    setOfflineCount(queue.filter((s) => !s.synced).length);
    setSyncing(false);
    if (synced > 0) {
      setResult({ type: "success", message: `${synced} offline gespeicherte(r) Scan(s) synchronisiert.` });
    }
  }, []);

  useEffect(() => {
    if (isOnline && offlineCount > 0) syncOfflineQueue();
  }, [isOnline, offlineCount, syncOfflineQueue]);

  // ── Scan handler ─────────────────────────────────────────
  const handleScan = useCallback(async (decodedText: string) => {
    if (cooldownRef.current || decodedText === lastScannedRef.current) return;

    let token: string | null = null;
    try {
      token = new URL(decodedText).searchParams.get("token");
    } catch {
      token = decodedText.length > 20 ? decodedText : null;
    }

    if (!token) {
      setResult({ type: "error", message: "Ungültiger QR-Code – kein gültiges Token gefunden." });
      return;
    }

    cooldownRef.current = true;
    lastScannedRef.current = decodedText;

    if (!navigator.onLine) {
      const queue = loadOfflineQueue();
      queue.push({ token, scannedAt: new Date().toISOString(), synced: false });
      saveOfflineQueue(queue);
      setOfflineCount(queue.filter((s) => !s.synced).length);
      setResult({ type: "success", message: "Offline gespeichert – wird synchronisiert sobald Verbindung besteht." });
      setTimeout(() => { cooldownRef.current = false; lastScannedRef.current = ""; }, 3000);
      return;
    }

    try {
      const res = await fetch("/api/checkin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResult({ type: "error", message: data.error ?? "Fehler beim Check-In." });
      } else if (data.alreadyCheckedIn) {
        setResult({
          type: "duplicate",
          message: `Bereits eingecheckt um ${formatTime(data.checkedInAt)}`,
          participantName: data.participant?.name,
          guests: data.participant?.guests,
        });
      } else {
        setResult({
          type: "success",
          message: "Erfolgreich eingecheckt!",
          participantName: data.participant?.name,
          guests: data.participant?.guests,
        });
      }
    } catch {
      setResult({ type: "error", message: "Netzwerkfehler. Bitte versuche es erneut." });
    }

    setTimeout(() => { cooldownRef.current = false; lastScannedRef.current = ""; }, 3000);
  }, []);

  // Keep ref in sync so the qrcode callback always calls the latest version
  handleScanRef.current = handleScan;

  // ── Camera init / cleanup ────────────────────────────────
  useEffect(() => {
    // Defer initialization by one tick. In React 18 StrictMode (dev), effects
    // run twice: mount → cleanup → mount. The cleanup fires synchronously and
    // cancels the pending timer, so the camera is only ever started once —
    // during the second (real) mount.
    let timerId: ReturnType<typeof setTimeout>;
    let qr: Html5Qrcode | null = null;

    timerId = setTimeout(() => {
      qr = new Html5Qrcode("qr-reader");
      qrRef.current = qr;

      qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 }, aspectRatio: 1 },
        (text) => handleScanRef.current(text),
        undefined // suppress per-frame "not found" errors
      )
        .then(() => setCameraState("scanning"))
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          setCameraState("error");
          setCameraError(msg.includes("Permission") || msg.includes("NotAllowed")
            ? "Kamera-Zugriff verweigert. Bitte Berechtigung in den Browser-Einstellungen erlauben."
            : "Kamera konnte nicht gestartet werden.");
        });
    }, 0);

    return () => {
      // Cancel before the camera even starts (handles StrictMode first cleanup)
      clearTimeout(timerId);

      if (qr) {
        // Stop all video tracks immediately to release the camera LED
        document.querySelectorAll<HTMLVideoElement>("#qr-reader video").forEach((video) => {
          (video.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
        });
        (async () => {
          try {
            if (qr!.isScanning) await qr!.stop();
            qr!.clear();
          } catch { /* ignore */ }
        })();
      }
    };
  }, []); // runs exactly once on mount / once on unmount

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo(`/admin/events/${eventId}/dashboard`)}
            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold text-lg leading-none">QR-Scanner</h1>
            <p className="text-xs text-gray-400 mt-0.5">Event #{eventId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <Wifi className="w-3.5 h-3.5" /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <WifiOff className="w-3.5 h-3.5" /> Offline
            </span>
          )}
          {offlineCount > 0 && (
            <button
              onClick={syncOfflineQueue}
              disabled={syncing || !isOnline}
              className="text-xs bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-medium px-2 py-1 rounded"
            >
              {syncing ? "Sync…" : `${offlineCount} ausstehend`}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Scan result */}
        {result && (
          <div className={`rounded-xl p-4 flex gap-3 items-start ${
            result.type === "success" ? "bg-green-900/60 border border-green-600"
            : result.type === "duplicate" ? "bg-amber-900/60 border border-amber-600"
            : "bg-red-900/60 border border-red-600"
          }`}>
            {result.type === "success"   && <CheckCircle   className="w-6 h-6 text-green-400 shrink-0 mt-0.5" />}
            {result.type === "duplicate" && <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />}
            {result.type === "error"     && <XCircle       className="w-6 h-6 text-red-400   shrink-0 mt-0.5" />}
            <div>
              {result.participantName && <p className="font-semibold text-white">{result.participantName}</p>}
              {result.guests !== undefined && result.guests > 0 && (
                <p className="text-sm text-gray-300">+ {result.guests} Begleitperson{result.guests > 1 ? "en" : ""}</p>
              )}
              <p className={`text-sm mt-0.5 ${
                result.type === "success" ? "text-green-300"
                : result.type === "duplicate" ? "text-amber-300"
                : "text-red-300"
              }`}>
                {result.message}
              </p>
            </div>
          </div>
        )}

        {/* Camera viewport */}
        <div className="rounded-xl overflow-hidden bg-black relative">
          {/* html5-qrcode renders the video into this div */}
          <div id="qr-reader" />

          {/* Overlay while starting */}
          {cameraState === "starting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-3 min-h-[300px]">
              <Camera className="w-8 h-8 text-gray-500 animate-pulse" />
              <p className="text-sm text-gray-400">Kamera wird gestartet…</p>
            </div>
          )}

          {/* Error state */}
          {cameraState === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-3 p-6 min-h-[300px]">
              <XCircle className="w-8 h-8 text-red-500" />
              <p className="text-sm text-red-300 text-center">{cameraError}</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-500">
          Kamera auf den QR-Code des Teilnehmers richten
        </p>

        <button
          onClick={() => navigateTo(`/admin/events/${eventId}/dashboard`)}
          className="w-full py-3 border border-gray-600 rounded-xl text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-sm"
        >
          Zum Dashboard wechseln
        </button>
      </div>

      <style>{`
        #qr-reader { border: none !important; padding: 0 !important; }
        #qr-reader video { width: 100% !important; height: auto !important; display: block !important; }
        #qr-reader canvas { display: none !important; }
        #qr-reader__scan_region { background: #000 !important; }
        #qr-reader__dashboard { display: none !important; }
      `}</style>
    </div>
  );
}
