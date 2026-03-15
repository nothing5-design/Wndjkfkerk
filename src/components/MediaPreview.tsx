import { useMemo } from "react";

interface MediaPreviewProps {
  url: string;
  mediaType?: string;
  className?: string;
  compact?: boolean;
}

const getYouTubeId = (url: string): string | null => {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] || null;
};

const MediaPreview = ({ url, mediaType, className = "", compact = false }: MediaPreviewProps) => {
  const ytId = useMemo(() => getYouTubeId(url), [url]);

  if (!url) return null;

  if (ytId) {
    return (
      <div className={`rounded-lg overflow-hidden border border-border ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          className={compact ? "w-full aspect-video max-w-[200px]" : "w-full aspect-video max-w-sm"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video"
        />
      </div>
    );
  }

  if (mediaType === "video") {
    return (
      <div className={`rounded-lg overflow-hidden border border-border ${className}`}>
        <video
          src={url}
          controls
          className={compact ? "max-w-[200px] h-auto" : "w-full max-w-sm h-auto"}
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      </div>
    );
  }

  if (mediaType === "animation") {
    return (
      <div className={`rounded-lg overflow-hidden border border-border ${className}`}>
        <img
          src={url}
          alt="GIF preview"
          className={compact ? "max-w-[200px] h-auto" : "w-full max-w-sm h-auto"}
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      </div>
    );
  }

  // Default: photo
  return (
    <div className={`rounded-lg overflow-hidden border border-border ${className}`}>
      <img
        src={url}
        alt="Media preview"
        className={compact ? "max-w-[200px] h-auto" : "w-full max-w-sm h-auto"}
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
    </div>
  );
};

export { getYouTubeId };
export default MediaPreview;
