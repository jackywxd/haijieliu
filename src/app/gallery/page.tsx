"use client";

import { useCallback, useEffect, useState } from "react";
import { mediaUrl } from "@/lib/config";
import galleryImages from "@/content/gallery-images.json";

const photos = galleryImages.map((name) => ({
  src: mediaUrl(`images/gallery/${name}`),
  alt: name.replace(/\.[^.]+$/, ""),
}));

export default function GalleryPage() {
  const [current, setCurrent] = useState<number | null>(null);

  const close = useCallback(() => setCurrent(null), []);

  const showPrev = useCallback(() => {
    setCurrent((i) => (i === null ? i : (i + photos.length - 1) % photos.length));
  }, []);

  const showNext = useCallback(() => {
    setCurrent((i) => (i === null ? i : (i + 1) % photos.length));
  }, []);

  useEffect(() => {
    if (current === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") showPrev();
      if (event.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, close, showPrev, showNext]);

  return (
    <>
      <div id="gallery-main">
        {photos.map((photo, index) => (
          <article className="thumb" key={photo.src}>
            <button
              type="button"
              className="img"
              onClick={() => setCurrent(index)}
              aria-label={photo.alt}
              style={{
                backgroundImage: `url(${photo.src})`,
                cursor: "pointer",
                padding: 0,
                border: 0,
              }}
            />
          </article>
        ))}
      </div>

      {current !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(0,0,0,0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            aria-label="Close"
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              background: "transparent",
              border: 0,
              color: "#fff",
              fontSize: "2rem",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              showPrev();
            }}
            aria-label="Previous photo"
            style={{
              position: "absolute",
              left: "0.75rem",
              background: "transparent",
              border: 0,
              color: "#fff",
              fontSize: "2.5rem",
              cursor: "pointer",
            }}
          >
            ‹
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[current].src}
            alt={photos[current].alt}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "min(96vw, 1200px)",
              maxHeight: "90vh",
              objectFit: "contain",
              filter: "none",
            }}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              showNext();
            }}
            aria-label="Next photo"
            style={{
              position: "absolute",
              right: "0.75rem",
              background: "transparent",
              border: 0,
              color: "#fff",
              fontSize: "2.5rem",
              cursor: "pointer",
            }}
          >
            ›
          </button>
        </div>
      ) : null}
    </>
  );
}
