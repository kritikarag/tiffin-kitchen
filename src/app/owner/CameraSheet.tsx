"use client";

import { useEffect, useRef, useState } from "react";
import { captureFrame, openCamera, type PhotoForUpload } from "./photo";
import styles from "./owner.module.css";

// The owner page's labels for her language; this sheet uses cameraTitle, takePhoto, usePhoto, retake,
// fromGallery, close and cameraBlocked.
type Labels = Record<string, string>;

type Props = {
  t: Labels;
  onPhoto: (photo: PhotoForUpload) => void;
  onGallery: () => void; // falls back to choosing a file
  onClose: () => void;
};

// A camera inside the page: live view, take the picture, then use it or retake it.
// Keeping it in the page (instead of the phone's camera app) means a screen recording shows every step.
export default function CameraSheet({ t, onPhoto, onGallery, onClose }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [taken, setTaken] = useState<PhotoForUpload | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    openCamera()
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((track) => track.stop());
        stream.current = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => !cancelled && setBlocked(true));
    return () => {
      cancelled = true;
      stream.current?.getTracks().forEach((track) => track.stop()); // turn the camera light off
    };
  }, []);

  function take() {
    if (!video.current) return;
    try {
      setTaken(captureFrame(video.current));
    } catch {
      // the camera hasn't delivered a frame yet; the button can simply be tapped again
    }
  }

  return (
    <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={t.cameraTitle}>
      <div className={styles.sheetTop}>
        <strong>{t.cameraTitle}</strong>
        <button type="button" className={styles.link} onClick={onClose}>
          {t.close}
        </button>
      </div>

      {blocked ? (
        <p className={styles.notice}>{t.cameraBlocked}</p>
      ) : (
        <div className={styles.viewfinder}>
          {/* The live view stays mounted while a photo is shown, so Retake is instant. */}
          <video ref={video} autoPlay playsInline muted hidden={taken != null} />
          {taken && (
            // eslint-disable-next-line @next/next/no-img-element -- a local preview, not a page image
            <img src={taken.previewUrl} alt="" />
          )}
        </div>
      )}

      <div className={styles.sheetActions}>
        {blocked ? null : taken ? (
          <>
            <button type="button" className={styles.yes} onClick={() => onPhoto(taken)}>
              ✓ {t.usePhoto}
            </button>
            <button type="button" className={styles.no} onClick={() => setTaken(null)}>
              ↺ {t.retake}
            </button>
          </>
        ) : (
          <button type="button" className={styles.shutter} onClick={take} aria-label={t.takePhoto}>
            <span aria-hidden="true">📸</span> {t.takePhoto}
          </button>
        )}
      </div>
      <button type="button" className={styles.galleryLink} onClick={onGallery}>
        🖼 {t.fromGallery}
      </button>
    </div>
  );
}
