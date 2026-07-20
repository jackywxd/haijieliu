"use client";

import { useEffect, useRef, useState } from "react";
import Journey from "@/components/Journey";
import SlideShow from "@/components/SlideShow";
import { mediaUrl } from "@/lib/config";
import bgImages from "@/content/bg-images.json";

const settings = {
  images: bgImages.map((name) => ({
    url: mediaUrl(`images/bg/${name}`),
    position: "center",
  })),
  delay: 8000,
};

export default function JourneyPage() {
  const [loading, setLoading] = useState("is-loading");
  const [isArticleVisible, setIsArticleVisible] = useState(false);
  const [timeout, setTimeoutState] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadId = window.setTimeout(() => setLoading(""), 100);
    const onMouseDown = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node) &&
        isArticleVisible
      ) {
        handleCloseArticle();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      window.clearTimeout(loadId);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [isArticleVisible]);

  function handleCloseArticle() {
    setTimeoutState((v) => !v);
    window.setTimeout(() => {
      setTimeoutState((v) => !v);
    }, 325);
    window.setTimeout(() => {
      setIsArticleVisible(false);
    }, 350);
  }

  return (
    <div
      className={`journey-body ${loading} ${
        isArticleVisible ? "is-article-visible" : ""
      }`}
    >
      <div id="journey-wrapper" ref={wrapperRef}>
        <Journey timeout={timeout} />
      </div>
      <SlideShow settings={settings} />
    </div>
  );
}
