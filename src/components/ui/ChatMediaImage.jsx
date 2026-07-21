import { useEffect, useState } from "react";
import { mediaUrlCandidates } from "../../lib/driverMedia.js";

/** عرض صورة شات مع بدائل الرابط (نفس أسلوب صور الرخص/الهوية) */
export default function ChatMediaImage({ src, alt = "مرفق", className = "" }) {
  const [failed, setFailed] = useState(false);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const candidates = mediaUrlCandidates(src);
  const currentSrc = candidates[candidateIndex] || "";

  useEffect(() => {
    setFailed(false);
    setCandidateIndex(0);
  }, [src]);

  if (!currentSrc || failed) {
    return (
      <div className={`bg-black/5 text-gray-400 flex items-center justify-center text-xs min-h-[6rem] rounded-lg ${className}`}>
        تعذر تحميل الصورة
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => {
        if (candidateIndex + 1 < candidates.length) {
          setCandidateIndex((i) => i + 1);
          return;
        }
        setFailed(true);
      }}
    />
  );
}
