"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail } from "lucide-react";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialError =
    searchParams.get("error") === "auth_fehler"
      ? "Der Login-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an."
      : "";

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: false,
        },
      });

      if (signInError) {
        setError(
          "Login-Code konnte nicht versendet werden. Bitte prüfe die E-Mail-Adresse und versuche es erneut.",
        );
      } else {
        setStage("code");
      }
    } catch {
      setError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });

      if (verifyError) {
        setError(
          "Der Code ist ungültig oder abgelaufen. Bitte fordere einen neuen an.",
        );
      } else {
        router.push("/admin");
        router.refresh();
      }
    } catch {
      setError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  };

  if (stage === "code") {
    return (
      <form onSubmit={handleVerifyCode} className="space-y-4">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm text-gray-700">
            Wir haben dir einen Login-Link und einen 6-stelligen Code an{" "}
            <strong>{email}</strong> geschickt.
          </p>
          <p className="text-xs text-gray-500">
            Klicke auf den Link in der Mail oder gib den Code unten ein.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">Login-Code</Label>
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            required
            autoFocus
            placeholder="000000"
            className="text-center text-2xl tracking-[0.4em] font-mono"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading || code.length !== 6}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Anmelden...
            </>
          ) : (
            "Anmelden"
          )}
        </Button>

        <button
          type="button"
          onClick={() => {
            setStage("email");
            setCode("");
            setError("");
          }}
          className="w-full text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          Andere E-Mail-Adresse verwenden
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendCode} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-Mail-Adresse</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          placeholder="name@example.com"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Wird gesendet...
          </>
        ) : (
          "Login-Code senden"
        )}
      </Button>
    </form>
  );
}

export default function LoginForm() {
  return (
    <Suspense>
      <LoginFormInner />
    </Suspense>
  );
}
