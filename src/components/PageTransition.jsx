import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function PageTransition({ children }) {
  const location = useLocation();
  const [displayedLocation, setDisplayedLocation] = useState(location);
  const [phase, setPhase] = useState("enter"); // enter | exit

  useEffect(() => {
    // Start exit animation
    setPhase("exit");

    const t = setTimeout(() => {
      setDisplayedLocation(location);
      // Start enter animation
      setPhase("enter");
    }, 140);

    return () => clearTimeout(t);
  }, [location]);

  return (
    <div
      key={displayedLocation.key}
      className={
        "w-full " +
        (phase === "exit"
          ? "animate-[pageExit_140ms_ease-in_forwards]"
          : "animate-[pageEnter_180ms_ease-out_forwards]")
      }
    >
      {children}

      <style>
        {`
          @keyframes pageEnter {
            from { opacity: 0; transform: translate3d(0, 8px, 0) scale(0.985); filter: blur(3px); }
            to   { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
          }
          @keyframes pageExit {
            from { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
            to   { opacity: 0; transform: translate3d(0, -6px, 0) scale(0.995); filter: blur(2px); }
          }
        `}
      </style>
    </div>
  );
}

