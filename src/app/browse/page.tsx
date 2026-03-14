"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MediaGrid } from "@/components/media-grid";

interface Section {
  key: string;
  title: string;
  type: string;
}

interface MediaItem {
  ratingKey: string;
  title: string;
  year?: number;
  thumb?: string | null;
  art?: string | null;
  type: string;
  summary?: string;
}

export default function BrowsePage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MediaItem[] | null>(null);
  const [hero, setHero] = useState<MediaItem | null>(null);
  const [sort, setSort] = useState("titleSort:asc");
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    fetch("/api/library")
      .then((r) => r.json())
      .then((data) => {
        setSections(data);
        if (data.length > 0) setActiveSection(data[0].key);
      });
  }, []);

  const loadItems = useCallback(
    async (sectionId: string, start = 0, append = false) => {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const res = await fetch(
        `/api/browse?sectionId=${sectionId}&start=${start}&size=50&sort=${sort}`
      );
      const data = await res.json();

      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setTotalSize(data.totalSize);

      if (!append && data.items.length > 0) {
        const randomItem = data.items[Math.floor(Math.random() * Math.min(data.items.length, 10))];
        setHero(randomItem);
      }

      setLoading(false);
      setLoadingMore(false);
    },
    [sort]
  );

  useEffect(() => {
    if (activeSection) {
      loadItems(activeSection);
    }
  }, [activeSection, loadItems]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/browse?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.items);
    }, 300);
  };

  const handleLoadMore = () => {
    if (activeSection && items.length < totalSize) {
      loadItems(activeSection, items.length, true);
    }
  };

  const displayItems = searchResults ?? items;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      {hero && !searchResults && (
        <div className="relative h-[50vh] mb-8">
          {hero.art && (
            <img
              src={`${hero.art}&w=1920&h=1080`}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-zinc-950/30" />
          <div className="absolute bottom-0 left-0 right-0 p-8 max-w-4xl">
            <h2 className="text-4xl font-bold mb-2">{hero.title}</h2>
            {hero.year && <p className="text-zinc-400 mb-2">{hero.year}</p>}
            {hero.summary && (
              <p className="text-zinc-300 text-sm line-clamp-3 max-w-2xl">{hero.summary}</p>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800/50 px-6 py-4">
        <div className="flex items-center gap-4 max-w-[1800px] mx-auto">
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent shrink-0">
            Sharerr
          </h1>

          {/* Library tabs */}
          <div className="flex gap-2">
            {sections.map((section) => (
              <button
                key={section.key}
                onClick={() => {
                  setActiveSection(section.key);
                  setSearchResults(null);
                  setSearchQuery("");
                }}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  activeSection === section.key && !searchResults
                    ? "bg-white text-black"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-zinc-800 text-sm rounded-lg px-3 py-1.5 border border-zinc-700 text-zinc-300"
          >
            <option value="titleSort:asc">Title A-Z</option>
            <option value="titleSort:desc">Title Z-A</option>
            <option value="year:desc">Newest First</option>
            <option value="year:asc">Oldest First</option>
            <option value="rating:desc">Highest Rated</option>
            <option value="addedAt:desc">Recently Added</option>
          </select>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="bg-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-sm border border-zinc-700 focus:border-purple-500 outline-none w-48 focus:w-64 transition-all"
            />
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 max-w-[1800px] mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <MediaGrid items={displayItems} />

            {!searchResults && items.length < totalSize && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loadingMore ? "Loading..." : `Load More (${items.length}/${totalSize})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
