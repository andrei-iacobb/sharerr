"use client";

import { MediaCard } from "./media-card";

interface MediaItem {
  ratingKey: string;
  title: string;
  year?: number;
  thumb?: string | null;
  type: string;
}

export function MediaGrid({ items }: { items: MediaItem[] }) {
  if (!items.length) {
    return (
      <div className="text-center py-20 text-zinc-500">
        <p className="text-lg">No items found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
      {items.map((item) => (
        <MediaCard key={item.ratingKey} {...item} />
      ))}
    </div>
  );
}
