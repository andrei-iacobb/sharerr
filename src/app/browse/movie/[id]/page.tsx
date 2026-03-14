"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Player } from "@/components/player";

interface MovieDetail {
  ratingKey: string;
  title: string;
  year?: number;
  summary?: string;
  thumb?: string | null;
  art?: string | null;
  contentRating?: string;
  rating?: number;
  audienceRating?: number;
  duration?: number;
  Genre?: { tag: string }[];
  Role?: { tag: string; thumb?: string }[];
}

export default function MoviePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [streamData, setStreamData] = useState<{
    hlsUrl: string;
    directUrl: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/browse?ratingKey=${id}`)
      .then((r) => r.json())
      .then((data) => {
        setMovie(data);
        setLoading(false);
      });
  }, [id]);

  const handlePlay = async () => {
    const res = await fetch("/api/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ratingKey: id }),
    });
    const data = await res.json();
    if (data.hlsUrl) {
      setStreamData(data);
      setPlaying(true);
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "";
    const hours = Math.floor(ms / 3600000);
    const mins = Math.round((ms % 3600000) / 60000);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">Movie not found</p>
      </div>
    );
  }

  if (playing && streamData) {
    return (
      <Player
        hlsUrl={streamData.hlsUrl}
        directUrl={streamData.directUrl}
        title={streamData.title}
        onBack={() => setPlaying(false)}
      />
    );
  }

  return (
    <div className="min-h-screen">
      {/* Backdrop */}
      <div className="relative h-[60vh]">
        {movie.art && (
          <img
            src={`${movie.art}&w=1920&h=1080`}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-zinc-950/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative -mt-48 px-8 max-w-6xl mx-auto flex gap-8">
        {/* Poster */}
        {movie.thumb && (
          <div className="shrink-0 hidden md:block">
            <img
              src={movie.thumb}
              alt={movie.title}
              className="w-64 rounded-lg shadow-2xl"
            />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 space-y-4">
          <h1 className="text-4xl font-bold">{movie.title}</h1>

          <div className="flex items-center gap-3 text-sm text-zinc-400 flex-wrap">
            {movie.year && <span>{movie.year}</span>}
            {movie.contentRating && (
              <span className="px-2 py-0.5 border border-zinc-600 rounded text-xs">
                {movie.contentRating}
              </span>
            )}
            {movie.duration && <span>{formatDuration(movie.duration)}</span>}
            {movie.rating && <span>Critics: {movie.rating.toFixed(1)}/10</span>}
            {movie.audienceRating && <span>Audience: {movie.audienceRating.toFixed(1)}/10</span>}
          </div>

          {movie.Genre && movie.Genre.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {movie.Genre.map((g) => (
                <span key={g.tag} className="px-3 py-1 bg-zinc-800 rounded-full text-sm text-zinc-300">
                  {g.tag}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={handlePlay}
            className="inline-flex items-center gap-2 px-8 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-lg font-medium transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play
          </button>

          {movie.summary && (
            <p className="text-zinc-300 leading-relaxed max-w-3xl">{movie.summary}</p>
          )}

          {movie.Role && movie.Role.length > 0 && (
            <div className="pt-4">
              <h3 className="text-sm font-medium text-zinc-500 mb-3">Cast</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {movie.Role.slice(0, 10).map((role) => (
                  <div key={role.tag} className="shrink-0 text-center w-20">
                    <div className="w-16 h-16 mx-auto rounded-full bg-zinc-800 overflow-hidden mb-1">
                      {role.thumb && (
                        <img src={`/api/image?path=${encodeURIComponent(role.thumb)}&w=100&h=100`} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 truncate">{role.tag}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => router.back()}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            &larr; Back to library
          </button>
        </div>
      </div>
    </div>
  );
}
