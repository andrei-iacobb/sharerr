"use client";

import { useState, useRef, type KeyboardEvent } from "react";

export function PinInput({
  onComplete,
  disabled = false,
}: {
  onComplete: (pin: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (value.length >= 4) {
      onComplete(value);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Enter PIN"
        autoFocus
        className="w-48 h-14 text-center text-2xl font-mono tracking-[0.3em] bg-zinc-800/50 border border-zinc-700 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all disabled:opacity-50 placeholder:text-zinc-600 placeholder:text-base placeholder:tracking-normal"
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || value.length < 4}
        className="px-8 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
}
