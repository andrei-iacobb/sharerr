"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Player } from "@/components/player";

export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [streamData, setStreamData] = useState<{
    hlsUrl: string;
    directUrl: string;
    title: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ratingKey: id }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setStreamData(data);
        }
      })
      .catch(() => setError("Failed to load stream"));
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!streamData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Player
      hlsUrl={streamData.hlsUrl}
      directUrl={streamData.directUrl}
      title={streamData.title}
      onBack={() => router.back()}
    />
  );
}
