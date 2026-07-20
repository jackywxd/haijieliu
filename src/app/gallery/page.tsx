"use client";

import { useCallback, useState, type ComponentType, type ReactNode } from "react";
import Carousel, { Modal, ModalGateway } from "react-images";
import Gallery from "react-photo-gallery";
import { mediaUrl } from "@/lib/config";
import galleryImages from "@/content/gallery-images.json";

const ModalGatewayWrapper = ModalGateway as ComponentType<{
  children?: ReactNode;
}>;

const photos = galleryImages.map((name) => ({
  src: mediaUrl(`images/gallery/${name}`),
  width: 4,
  height: 3,
}));

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
      <Gallery photos={photos} onClick={openLightbox} />
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
