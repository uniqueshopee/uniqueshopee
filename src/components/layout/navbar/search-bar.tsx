"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
  autoFocus?: boolean;
  onSubmit?: (query: string) => void;
  placeholder?: string;
  variant?: "default" | "home";
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
};

function SearchBar({ className, autoFocus, onSubmit, placeholder, variant = "default" }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const submitQuery = (rawQuery: string) => {
    const trimmedQuery = rawQuery.trim();
    router.push(trimmedQuery ? `/search?q=${encodeURIComponent(trimmedQuery)}` : "/search");
    onSubmit?.(trimmedQuery);
  };

  const startVoiceSearch = () => {
    if (typeof window === "undefined") {
      return;
    }

    const speechWindow = window as Window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };

    const SpeechRecognitionCtor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;

    if (!SpeechRecognitionCtor) {
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      setQuery(transcript);
      submitQuery(transcript);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        submitQuery(query);
      }}
      className={cn(
        "relative w-full",
        variant === "home" &&
          "flex items-center gap-2 rounded-[1.3rem] border border-border/70 bg-white/92 px-3 py-3 shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      <Search
        className={cn(
          "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted",
          variant === "home" && "left-4",
        )}
        aria-hidden="true"
      />
      <label htmlFor="site-search" className="sr-only">
        Search products
      </label>
      <input
        id="site-search"
        name="q"
        type="search"
        autoFocus={autoFocus}
        placeholder={placeholder ?? "Search paints, plumbing & home improvement..."}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={cn(
          "w-full bg-transparent text-sm font-medium text-text placeholder:text-muted placeholder:font-normal",
          variant === "home"
            ? "h-10 min-w-0 flex-1 border-0 pl-10 pr-12 focus-visible:outline-none"
            : "h-12 rounded-full border border-border/80 bg-white/90 pl-10 pr-16 shadow-[var(--shadow-sm)]",
          "text-sm font-medium text-text placeholder:text-muted placeholder:font-normal",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:bg-white",
        )}
      />
      <button
        type="button"
        onClick={() => void startVoiceSearch()}
        aria-label={isListening ? "Stop voice search" : "Start voice search"}
        aria-pressed={isListening}
        className={cn(
          "absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          isListening ? "bg-accent text-accent-foreground" : "bg-background-secondary text-text hover:bg-background-secondary/80",
          variant === "home" && "right-3",
        )}
      >
        {isListening ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
      </button>
    </form>
  );
}

export { SearchBar };
