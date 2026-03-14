"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PinInput } from "@/components/pin-input";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePinComplete = async (pin: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/invite/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid PIN");
        setLoading(false);
        return;
      }

      router.push(data.redirectUrl);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Sharerr
          </h1>
          <p className="text-zinc-400">Enter your PIN to continue</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm">
          <PinInput onComplete={handlePinComplete} disabled={loading} />

          {loading && (
            <div className="mt-6 flex justify-center">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <p className="mt-4 text-red-400 text-sm">{error}</p>
          )}
        </div>

        <p className="text-xs text-zinc-600">
          This link was shared with you privately. Do not share it further.
        </p>
      </div>
    </div>
  );
}
