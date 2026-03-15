"use client";

import { useEffect, useRef } from "react";

interface PlayerProps {
  streamUrl: string;
  title: string;
  onBack: () => void;
}

export function Player({ streamUrl, title, onBack }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Safari has native HLS support
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.play().catch(() => {});
      return;
    }

    // Use HLS.js for other browsers
    let hls: import("hls.js").default | null = null;

    import("hls.js").then(({ default: Hls }) => {
      if (!Hls.isSupported()) {
        video.src = streamUrl;
        video.play().catch(() => {});
        return;
      }

      hls = new Hls({
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        xhrSetup: (xhr) => {
          xhr.withCredentials = true;
        },
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
    });

    return () => {
      hls?.destroy();
    };
  }, [streamUrl]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <span className="text-white/60 text-sm">{title}</span>
      </div>
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        autoPlay
        playsInline
      />
    </div>
  );
}
