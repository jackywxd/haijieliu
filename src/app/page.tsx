import Header from "@/components/Header";
import Timeline from "@/components/Timeline";
import Footer from "@/components/Footer";
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

export default function HomePage() {
  return (
    <>
      <div className="main-body">
        <Header />
        <Timeline />
      </div>
      <Footer />
      <SlideShow settings={settings} />
    </>
  );
}
