'use client';

import { useState, useEffect, useRef } from 'react';
import { getContentUrl, getContentFallbackUrl } from '@/lib/ordinals';

interface InscriptionViewerProps {
  inscriptionId: string;
  size: 'thumbnail' | 'full';
}

export function InscriptionViewer({ inscriptionId, size }: InscriptionViewerProps) {
  const [src, setSrc] = useState(() => getContentUrl(inscriptionId));
  const [failed, setFailed] = useState(false);
  const [triedFallback, setTriedFallback] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Probe primary URL with a hidden img — on error, switch to fallback
  useEffect(() => {
    const img = new Image();
    const primaryUrl = getContentUrl(inscriptionId);
    const fallbackUrl = getContentFallbackUrl(inscriptionId);

    img.onload = () => {
      // Primary loaded fine — clear timeout
      if (timerRef.current) clearTimeout(timerRef.current);
    };

    img.onerror = () => {
      // Image probe failed — could be non-image content or primary is down
      // Don't switch yet — let timeout handle it (non-image content won't load as img)
    };

    img.src = primaryUrl;

    // Timeout fallback: if iframe hasn't visibly loaded after 5s, try fallback
    timerRef.current = setTimeout(() => {
      if (!triedFallback) {
        setSrc(fallbackUrl);
        setTriedFallback(true);

        // Second timeout: if fallback also fails, show placeholder
        timerRef.current = setTimeout(() => {
          setFailed(true);
        }, 5000);
      }
    }, 5000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [inscriptionId, triedFallback]);

  // Listen for iframe load event to cancel fallback timer
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [src]);

  const isThumbnail = size === 'thumbnail';

  const containerClass = isThumbnail
    ? 'w-[150px] h-[150px] flex-shrink-0'
    : 'w-full max-w-[400px] aspect-square mx-auto';

  if (failed) {
    return (
      <div className={`${containerClass} bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center`}>
        <p className="text-xs text-gray-600 text-center px-2">Content unavailable</p>
      </div>
    );
  }

  return (
    <div className={`${containerClass} bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden`}>
      <iframe
        ref={iframeRef}
        src={src}
        sandbox="allow-scripts"
        loading="lazy"
        className="w-full h-full border-0"
        style={isThumbnail ? { pointerEvents: 'none' } : undefined}
        title={`Inscription ${inscriptionId}`}
      />
    </div>
  );
}
