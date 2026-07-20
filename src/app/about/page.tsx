"use client";

import { useEffect, useState } from "react";
import SlideShow from "@/components/SlideShow";
import { mediaUrl } from "@/lib/config";

const settings = {
  images: [{ url: mediaUrl("images/about.jpg"), position: "center" }],
  delay: 6000,
};

export default function AboutPage() {
  const [isPreloaded, setPreloaded] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setPreloaded(false), 200);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <>
      <div
        className={
          isPreloaded
            ? "about-landing about-main-body is-preload"
            : "about-landing about-main-body"
        }
      >
        <div id="about-wrapper">
          <section id="about-banner">
            <h2>For my beloved wife</h2>
            <div className="content">
              <p>
                My wife, Haijie Liu, suddenly passed away on Aug 28 2020 after
                suffering couple months of depression. Only then I realized she
                was the angel in my life.
              </p>
              <p>
                I was unable to understand the pain she had gone through, not
                able to give what she most needed support. Instead it was me
                caused more pain to her because sometime I blamed on her why she
                had depression when she had everything to have a joyful life. I
                am so regret that I did not spend qualited time with my wife
                during the last days of her life. But everything was too late!
              </p>
              <p>
                It was a tearful experience to create this website when knowing
                your love one will never come back. It cuts my heart watching her
                face on the pictures because she looks so real everything seems
                just happened yesterday! But I know I have to do it or I will
                regret again for my whole life.
              </p>
              <p>
                This website is dedicated for my beloved wife, Haijie. You are a
                devoted Christian, you are my angel, you are a loving mother!
                Today you are with our Heavenly Father, You are not far away
                from us and will be always remembered.
              </p>
              <p>
                相聚很短，思念太長， <br />
                從此天人兩隔，只恨餘生漫長
              </p>
              <hr />
            </div>
            <div className="author">
              <div>09/19/2020</div>
              <a href="https://jackywu.ca">Jacky Wu</a>
            </div>
          </section>
        </div>
      </div>
      <SlideShow settings={settings} />
    </>
  );
}
