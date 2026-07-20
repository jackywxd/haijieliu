"use client";

import Image from "next/image";
import {
  useCallback,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import Carousel, { Modal, ModalGateway } from "react-images";
import Gallery, { type RenderImageProps } from "react-photo-gallery";
import { mediaUrl } from "@/lib/config";
import galleryImages from "@/content/gallery-images.json";

const ModalGatewayWrapper = ModalGateway as ComponentType<{
  children?: ReactNode;
}>;

const photos = galleryImages.map((name) => ({
  src: mediaUrl(`images/gallery/${name}`),
  width: 4,
  height: 3,
  alt: name,
}));

function renderImage(props: RenderImageProps) {
  const { index, left, top, photo, margin, direction, onClick } = props;
  const style: React.CSSProperties =
    direction === "column"
      ? { position: "absolute", left, top, margin }
      : { margin };

  return (
    <div key={photo.key || photo.src} style={style}>
      <button
        type="button"
        onClick={(event) => onClick?.(event, { index })}
        style={{
          display: "block",
          padding: 0,
          border: 0,
          background: "transparent",
          cursor: "pointer",
          lineHeight: 0,
        }}
        aria-label={photo.alt || `Photo ${index + 1}`}
      >
        <Image
          src={photo.src}
          alt={photo.alt || ""}
          width={photo.width}
          height={photo.height}
          sizes="(max-width: 768px) 50vw, 25vw"
          unoptimized
          style={{
            width: photo.width,
            height: photo.height,
            objectFit: "cover",
            display: "block",
          }}
        />
      </button>
    </div>
  );
}

export default function GalleryPage() {
  const [currentImage, setCurrentImage] = useState(0);
  const [viewerIsOpen, setViewerIsOpen] = useState(false);

  const openLightbox = useCallback(
    (_event: React.MouseEvent, { index }: { index: number }) => {
      setCurrentImage(index);
      setViewerIsOpen(true);
    },
    [],
  );

  const closeLightbox = () => {
    setCurrentImage(0);
    setViewerIsOpen(false);
  };

  return (
    <div id="gallery-main">
      <Gallery photos={photos} onClick={openLightbox} renderImage={renderImage} />
      <ModalGatewayWrapper>
        {viewerIsOpen ? (
          <Modal onClose={closeLightbox}>
            <Carousel
              currentIndex={currentImage}
              views={photos.map((photo) => ({
                source: photo.src,
                caption: "",
              }))}
            />
          </Modal>
        ) : null}
      </ModalGatewayWrapper>
    </div>
  );
}
