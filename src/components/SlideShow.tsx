"use client";

import { useEffect, useState } from "react";

export type SlideImage = {
  url: string;
  position?: string;
};

type Settings = {
  images: SlideImage[];
  delay: number;
};

export default function SlideShow({ settings }: { settings: Settings }) {
  const [pos, setPos] = useState(0);
  const [lastPos, setLastPos] = useState(0);

  useEffect(() => {
    if (!settings.images.length) return;

    const interval = window.setInterval(() => {
      setPos((current) => {
        const next = current + 1 >= settings.images.length ? 0 : current + 1;
        setLastPos(current);
        window.setTimeout(() => setLastPos(next), settings.delay / 2);
        return next;
      });
    }, settings.delay);

    return () => window.clearInterval(interval);
  }, [settings.delay, settings.images.length]);

  return (
    <div id="bg">
      {settings.images.map((image, i) => (
        <div
          key={image.url}
          style={{
            backgroundPosition: image.position || "center",
            backgroundImage: `url("${image.url}")`,
          }}
          className={
            i === pos ? "visible top" : i === lastPos ? "visible" : ""
          }
        />
      ))}
    </div>
  );
}
