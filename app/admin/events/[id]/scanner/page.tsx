"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft, Wifi, WifiOff } from "lucide-react";

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

export default function ScannerPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const router = useRouter();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);
  const lastScannedRef = useRef<string>("");
  const cooldownRef = useRef(false);

  const [result, setResult] = useState<ScanResult | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Track online status
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
        if (res.ok) {
          scan.synced = true;
          synced++;
        }
      } catch {
        // keep unsynced
      }
    }
    saveOfflineQueue(queue);
    setOfflineCount(queue.filter((s) => !s.synced).length);
    setSyncing(false);
    if (synced > 0) {
      setResult({
        type: "success",
        message: `${synced} offline gespeicherte(r) Scan(s) synchronisiert.`,
      });
    }
  }, []);

  // Auto-sync when back online
  useEffect(() => {
    if (isOnline && offlineCount > 0) {
      syncOfflineQueue();
    }
  }, [isOnline, offlineCount, syncOfflineQueue]);

  const extractToken = (scanned: string): string | null => {
    try {
      const url = new URL(scanned);
      return url.searchParams.get("token");
    } catch {
      // Maybe raw token was scanned
      return scanned.length > 20 ? scanned : null;
    }
  };

  const handleScan = useCallback(async (decodedText: string) => {
    if (cooldownRef.current || decodedText === lastScannedRef.current) return;

    const token = extractToken(decodedText);
    if (!token) {
      setResult({ type: "error", message: "Ungültiger QR-Code – kein gültiges Token gefunden." });
      return;
    }

    cooldownRef.current = true;
    lastScannedRef.current = decodedText;

    if (!navigator.onLine) {
      // Store offline
      const queue = loadOfflineQueue();
      queue.push({ token, scannedAt: new Date().toISOString(), synced: false });
      saveOfflineQueue(queue);
      setOfflineCount(queue.filter((s) => !s.synced).length);
      setResult({
        type: "success",
        message: "Offline gespeichert – wird synchronisiert sobald Verbindung besteht.",
      });
      setTimeout(() => {
        cooldownRef.current = false;
        lastScannedRef.current = "";
      }, 3000);
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
          checkedInAt: data.checkedInAt,
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

    // Allow next scan after 3 seconds
    setTimeout(() => {
      cooldownRef.current = false;
      lastScannedRef.current = "";
    }, 3000);
  }, []);

  // Init scanner
  useEffect(() => {
    if (!scannerDivRef.current) return;

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 280, height: 280 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true,
      },
      false
    );

    scanner.render(handleScan, (err) => {
      if (!err.includes("No MultiFormat Readers")) {
        console.debug("QR scan error:", err);
      }
    });
    scannerRef.current = scanner;

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [handleScan]);

  const formatTime = (iso?: string) => {
    if (!iso) return "–";
    return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/admin/events/${eventId}/dashboard`)}
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
        {/* Result feedback */}
        {result && (
          <div
            className={`rounded-xl p-4 flex gap-3 items-start transition-all ${
              result.type === "success"
                ? "bg-green-900/60 border border-green-600"
                : result.type === "duplicate"
                ? "bg-amber-900/60 border border-amber-600"
                : "bg-red-900/60 border border-red-600"
            }`}
          >
            {result.type === "success" && <CheckCircle className="w-6 h-6 text-green-400 shrink-0 mt-0.5" />}
            {result.type === "duplicate" && <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />}
            {result.type === "error" && <XCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />}
            <div>
              {result.participantName && (
                <p className="font-semibold text-white">{result.participantName}</p>
              )}
              {result.guests !== undefined && result.guests > 0 && (
                <p className="text-sm text-gray-300">+ {result.guests} Begleitperson{result.guests > 1 ? "en" : ""}</p>
              )}
              <p className={`text-sm mt-0.5 ${
                result.type === "success" ? "text-green-300" : result.type === "duplicate" ? "text-amber-300" : "text-red-300"
              }`}>
                {result.message}
              </p>
            </div>
          </div>
        )}

        {/* QR Scanner */}
        <div className="rounded-xl overflow-hidden bg-black">
          <div id="qr-reader" ref={scannerDivRef} />
        </div>

        <p className="text-center text-xs text-gray-500">
          Kamera auf den QR-Code des Teilnehmers richten
        </p>

        <button
          onClick={() => router.push(`/admin/events/${eventId}/dashboard`)}
          className="w-full py-3 border border-gray-600 rounded-xl text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-sm"
        >
          Zum Dashboard wechseln
        </button>
      </div>

      {/* Override html5-qrcode default styles for dark mode */}
      <style>{`
        #qr-reader { border: none !important; background: #000 !important; }
        #qr-reader video { border-radius: 0 !important; }
        #qr-reader__scan_region { background: #000 !important; }
        #qr-reader__dashboard { background: #1f2937 !important; color: #d1d5db !important; padding: 12px !important; }
        #qr-reader__dashboard button {
          background: #16a34a !important; color: white !important; border: none !important;
          padding: 8px 16px !important; border-radius: 6px !important; cursor: pointer !important;
        }
        #qr-reader__dashboard select { background: #374151 !important; color: #f3f4f6 !important; border: 1px solid #4b5563 !important; border-radius: 4px !important; padding: 4px !important; }
        #qr-reader__status_span { color: #9ca3af !important; font-size: 12px !important; }
        #html5-qrcode-anchor-scan-type-change { color: #9ca3af !important; font-size: 12px !important; }
      `}</style>
    </div>
  );
}
