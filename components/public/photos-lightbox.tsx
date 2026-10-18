"use client";

import Lightbox from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";

export type LightboxPhoto = { src: string; width: number; height: number };

/** Full-screen gallery (loaded on demand by PhotosButton). */
export default function PhotosLightbox({
  photos,
  alt,
  open,
  onClose,
}: {
  photos: LightboxPhoto[];
  alt: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Lightbox
      open={open}
      close={onClose}
      slides={photos.map((p, i) => ({ ...p, alt: `${alt} — photo ${i + 1}` }))}
      plugins={[Zoom, Counter]}
      zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
      controller={{ closeOnBackdropClick: true, closeOnPullDown: true }}
    />
  );
}
