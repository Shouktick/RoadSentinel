"use client";
import { useEffect, useRef, useState } from "react";
import { freshnessMs, gpsReader, type RideFix } from "@/lib/ride-gps";

const idle: RideFix = { fix: null, reading: null, message: "Location is off." };
export function useRideGps() {
  const [active, setActive] = useState(false);
  const [snapshot, setSnapshot] = useState(idle);
  const [now, setNow] = useState(0);
  const [lastFix, setLastFix] = useState<RideFix["fix"]>(null);
  const [measurement, setMeasurement] = useState<{
    at: number;
    accuracy: number;
  } | null>(null);
  const cancel = useRef<(() => void) | null>(null);
  function stop(message = "Location is off.") {
    cancel.current?.();
    setMeasurement(null);
    setSnapshot({ ...idle, message });
    setActive(false);
  }
  function start() {
    if (!window.isSecureContext || !navigator.geolocation) {
      stop(
        "Location is unavailable here. Open this page in your phone’s browser and enable location services.",
      );
      return;
    }
    cancel.current?.();
    const geo = navigator.geolocation;
    let read = gpsReader();
    let listening = true;
    let watch: number | undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const pause = () => {
      if (document.hidden)
        stop("Ride paused when the page was hidden. Start GPS to resume.");
    };
    const leave = () => stop("Monitoring stopped. Start GPS to resume.");
    window.addEventListener("pagehide", leave);
    document.addEventListener("visibilitychange", pause);
    cancel.current = () => {
      listening = false;
      if (watch !== undefined) geo.clearWatch(watch);
      window.clearInterval(timer);
      window.removeEventListener("pagehide", leave);
      document.removeEventListener("visibilitychange", pause);
      cancel.current = null;
    };
    setActive(true);
    setNow(Date.now());
    setSnapshot({ ...idle, message: "Waiting for your phone’s location…" });
    try {
      watch = geo.watchPosition(
        (position) => {
          if (!listening) return;
          const time = Date.now();
          const next = read(position, time);
          if (!next) return;
          setNow(time);
          setMeasurement({
            at: position.timestamp,
            accuracy: position.coords.accuracy,
          });
          if (next.fix) setLastFix(next.fix);
          // Some phones send positions more often than a usable movement estimate.
          setSnapshot((prev) =>
            next.awaitingMovement &&
            prev.reading?.source === "Estimated from movement" &&
            time - prev.reading.at < freshnessMs
              ? {
                  ...next,
                  reading: prev.reading,
                  message: "Speed estimated between two locations",
                }
              : next,
          );
        },
        (error) => {
          if (!listening) return;
          read = gpsReader();
          if (error.code === 1)
            stop(
              "Location access is off. Allow location in your browser’s site settings, then start GPS again.",
            );
          else
            setSnapshot({
              ...idle,
              message:
                error.code === 3
                  ? "GPS timed out. Waiting for the next reading."
                  : "Location signal unavailable. Waiting for your phone to reconnect.",
            });
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 },
      );
    } catch {
      stop(
        "GPS could not start. Check your phone’s location settings and try again.",
      );
    }
  }
  useEffect(() => () => cancel.current?.(), []);
  const freshFix =
    snapshot.fix && now - snapshot.fix.at < freshnessMs ? snapshot.fix : null;
  const reading =
    snapshot.reading && now - snapshot.reading.at < freshnessMs
      ? snapshot.reading
      : null;
  const stale = (snapshot.fix && !freshFix) || (snapshot.reading && !reading);
  return {
    active,
    start,
    stop,
    reading,
    fix: freshFix,
    lastFix,
    measurement,
    now,
    message: stale
      ? "Reading expired. Waiting for a fresh GPS update."
      : snapshot.message,
  };
}
