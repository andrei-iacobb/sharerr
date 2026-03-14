"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Player } from "@/components/player";
import { EpisodePicker } from "@/components/episode-picker";

interface ShowDetail {
  ratingKey: string;
  title: string;
  year?: number;
  summary?: string;
  thumb?: string | null;
  art?: string | null;
  contentRating?: string;
  rating?: number;
  audienceRating?: number;
  Genre?: { tag: string }[];
  leafCount?: number;
  childCount?: number;
}

export default function ShowPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [show, setShow] = useState<ShowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [streamData, setStreamData] = useState<{
    streamUrl: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/browse?ratingKey=${id}`)
      .then((r) => r.json())
      .then((data) => {
        setShow(data);
        setLoading(false);
      });
  }, [id]);

  const handlePlay = async (episodeKey: string) => {
    const res = await fetch("/api/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ratingKey: episodeKey }),
    });
    const data = await res.json();
    if (data.streamUrl) {
      setStreamData(data);
      setPlaying(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!show) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">Show not found</p>
      </div>
    );
  }

  if (playing && streamData) {
    return (
      <Player
        streamUrl={streamData.streamUrl}
        title={streamData.title}
        onBack={() => setPlaying(false)}
      />
    );
  }

  return (
    <div className="min-h-screen">
      {/* Backdrop */}
      <div className="relative h-[50vh]">
        {show.art && (
          <img
            src={`${show.art}&w=1920&h=1080`}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-zinc-950/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative -mt-40 px-8 max-w-6xl mx-auto">
        <div className="flex gap-8 mb-8">
          {show.thumb && (
            <div className="shrink-0 hidden md:block">
              <img
                src={show.thumb}
                alt={show.title}
                className="w-52 rounded-lg shadow-2xl"
              />
            </div>
          )}

          <div className="flex-1 space-y-3">
            <h1 className="text-4xl font-bold">{show.title}</h1>

            <div className="flex items-center gap-3 text-sm text-zinc-400 flex-wrap">
              {show.year && <span>{show.year}</span>}
              {show.contentRating && (
                <span className="px-2 py-0.5 border border-zinc-600 rounded text-xs">
                  {show.contentRating}
                </span>
              )}
              {show.childCount && <span>{show.childCount} Seasons</span>}
              {show.leafCount && <span>{show.leafCount} Episodes</span>}
              {show.rating && <span>Critics: {show.rating.toFixed(1)}/10</span>}
            </div>

            {show.Genre && show.Genre.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {show.Genre.map((g) => (
                  <span key={g.tag} className="px-3 py-1 bg-zinc-800 rounded-full text-sm text-zinc-300">
                    {g.tag}
                  </span>
                ))}
              </div>
            )}

            {show.summary && (
              <p className="text-zinc-300 leading-relaxed max-w-3xl">{show.summary}</p>
            )}

            <button
              onClick={() => router.back()}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              &larr; Back to library
            </button>
          </div>
        </div>

        {/* Episodes */}
        <div className="pb-12">
          <h2 className="text-xl font-bold mb-4">Episodes</h2>
          <EpisodePicker showRatingKey={id} onPlay={handlePlay} />
        </div>
      </div>
    </div>
  );
}
