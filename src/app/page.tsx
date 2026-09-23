import Header from "@/components/Header";
import Timeline from "@/components/Timeline";
import MemorialMusic from "@/components/MemorialMusic";
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

// The site had no structured data at all, so nothing told Google what it is or
// who it is about — for a memorial site those are the two facts that matter.
// Dates come from the header ("1973 - 2020") and the About page ("suddenly
// passed away on Aug 28 2020"); the birth date is a year only because that is
// all the site states.
const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://haijieliu.com/#website",
      url: "https://haijieliu.com",
      name: "劉海婕紀念網站 In Loving Memory of Haijie Liu",
      inLanguage: ["zh-Hant", "en"],
      about: { "@id": "https://haijieliu.com/#haijie" },
    },
    {
      "@type": "Person",
      "@id": "https://haijieliu.com/#haijie",
      name: "Haijie Liu",
      alternateName: ["劉海婕", "刘海婕", "海婕"],
      birthDate: "1973",
      deathDate: "2020-08-28",
      image: "https://media.haijieliu.com/images/about.jpg",
      mainEntityOfPage: "https://haijieliu.com",
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
      />
      <div className="main-body">
        <Header />
        <Timeline action={<MemorialMusic />} />
      </div>
      <SlideShow settings={settings} />
    </>
  );
}
