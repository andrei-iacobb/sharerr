"use client";

import Link from "next/link";

interface MediaCardProps {
  ratingKey: string;
  title: string;
  year?: number;
  thumb?: string | null;
  type: string;
}

export function MediaCard({ ratingKey, title, year, thumb, type }: MediaCardProps) {
  const href = type === "show" ? `/browse/show/${ratingKey}` : `/browse/movie/${ratingKey}`;

  return (
    <Link
      href={href}
      className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 transition-transform hover:scale-105 hover:z-10"
    >
      {thumb ? (
        <img
          src={thumb}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
          <span className="text-zinc-500 text-sm text-center px-2">{title}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
        <p className="text-sm font-medium truncate">{title}</p>
        {year && <p className="text-xs text-zinc-400">{year}</p>}
      </div>
    </Link>
  );
}
