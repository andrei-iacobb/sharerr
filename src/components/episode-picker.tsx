"use client";

import { useState, useEffect } from "react";

interface Episode {
  ratingKey: string;
  title: string;
  index?: number;
  parentIndex?: number;
  thumb?: string | null;
  summary?: string;
  duration?: number;
}

interface Season {
  ratingKey: string;
  title: string;
  index?: number;
}

export function EpisodePicker({
  showRatingKey,
  onPlay,
}: {
  showRatingKey: string;
  onPlay: (ratingKey: string) => void;
}) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/browse?ratingKey=${showRatingKey}&children=1`)
      .then((r) => r.json())
      .then((data) => {
        const s = data.items || [];
        setSeasons(s);
        if (s.length > 0) setSelectedSeason(s[0].ratingKey);
        setLoading(false);
      });
  }, [showRatingKey]);

  useEffect(() => {
    if (!selectedSeason) return;
    setLoading(true);
    fetch(`/api/browse?ratingKey=${selectedSeason}&children=1`)
      .then((r) => r.json())
      .then((data) => {
        setEpisodes(data.items || []);
        setLoading(false);
      });
  }, [selectedSeason]);

  const formatDuration = (ms?: number) => {
    if (!ms) return "";
    const mins = Math.round(ms / 60000);
    return `${mins}m`;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {seasons.map((season) => (
          <button
            key={season.ratingKey}
            onClick={() => setSelectedSeason(season.ratingKey)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm transition-colors ${
              selectedSeason === season.ratingKey
                ? "bg-purple-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {season.title}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {episodes.map((ep) => (
            <button
              key={ep.ratingKey}
              onClick={() => onPlay(ep.ratingKey)}
              className="w-full flex items-center gap-4 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors text-left group"
            >
              <div className="w-10 text-center text-zinc-500 text-sm font-mono shrink-0">
                {ep.index}
              </div>
              {ep.thumb && (
                <img
                  src={ep.thumb}
                  alt={ep.title}
                  className="w-32 h-18 object-cover rounded shrink-0"
                  loading="lazy"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate group-hover:text-purple-400 transition-colors">
                  {ep.title}
                </p>
                {ep.summary && (
                  <p className="text-sm text-zinc-400 line-clamp-2 mt-1">{ep.summary}</p>
                )}
              </div>
              {ep.duration && (
                <span className="text-sm text-zinc-500 shrink-0">{formatDuration(ep.duration)}</span>
              )}
              <svg
                className="w-8 h-8 text-white/0 group-hover:text-white transition-colors shrink-0"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
