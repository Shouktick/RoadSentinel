"use client";
import { useSyncExternalStore, useState } from "react";
import { subscribeStorage, useRideStorage } from "./useRideStorage";
import { Phone, Copy, Share2 } from "lucide-react";
import { Panel } from "./ui";
import type { RideFix } from "@/lib/ride-gps";

const phoneKey = "roadsentinel-trusted-phone";
const validNumber = (s: string) => /^\+?[0-9]{7,15}$/.test(s);
export default function RideEmergency({
  fix,
  lastFix,
  active,
  start,
}: {
  fix: RideFix["fix"];
  lastFix: RideFix["fix"];
  active: boolean;
  start: () => void;
}) {
  const [manual, setManual] = useState("");
  const [stored, savePhone] = useRideStorage("localStorage", phoneKey);
  const contact = validNumber(stored) ? stored : "";
  const [draft, setPhone] = useState<string | null>(null);
  const phone = draft ?? contact;
  const [status, setStatus] = useState("");
  const shareable = useSyncExternalStore(
    subscribeStorage,
    () => typeof navigator.share === "function",
    () => false,
  );
  const location = fix ?? lastFix;
  const coords = location
    ? location.latitude.toFixed(5) + ", " + location.longitude.toFixed(5)
    : "";
  const label = fix ? "GPS location" : "Last known GPS location";
  const manualText = manual.trim();
  const text = manualText
    ? "Passenger-entered location: " + manualText
    : location
      ? `${label}: ${coords} (accuracy about ${Math.round(location.accuracy)} m), recorded ${new Date(location.at).toLocaleString()}. https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}`
      : "";
  function saveContact() {
    const number = phone.replace(/[\s()-]/g, "");
    if (number && !validNumber(number)) {
      setStatus(
        "Enter a phone number with 7–15 digits, optionally starting with +.",
      );
      return;
    }
    try {
      savePhone(number);
      setPhone(null);
      setStatus(
        number
          ? "Trusted contact saved on this device."
          : "Trusted contact removed.",
      );
    } catch {
      setStatus("This browser could not save your contact.");
    }
  }
  async function share(copy: boolean) {
    try {
      if (copy) {
        await navigator.clipboard.writeText(text);
        setStatus("Location copied.");
      } else {
        await navigator.share({ title: "Passenger location", text });
        setStatus("Share sheet closed.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError")
        setStatus("Sharing cancelled.");
      else setStatus("Select and copy the location text below.");
    }
  }
  return (
    <div id="ride-help">
      <Panel
        title="Emergency assistance"
        subtitle="For an emergency in India, contact 112."
      >
        <div className="ride-actions">
          <a className="button ride-call" href="tel:112">
            <Phone size={17} /> Call 112
          </a>
          {contact && (
            <a className="button" href={"tel:" + contact}>
              Call trusted contact
            </a>
          )}
        </div>
        {location && (
          <p>
            {label}: {coords} · ±{Math.round(location.accuracy)} m ·{" "}
            {new Date(location.at).toLocaleString()}
          </p>
        )}
        {!fix && (
          <p>
            {active
              ? "Waiting for a GPS fix."
              : "Start monitoring to obtain coordinates, or enter a landmark below."}
          </p>
        )}
        {!active && (
          <button className="button" onClick={start}>
            Start GPS for my location
          </button>
        )}
        <label className="field" htmlFor="ride-landmark">
          Landmark or address (optional)
          <input
            id="ride-landmark"
            value={manual}
            maxLength={240}
            placeholder="e.g. Mysuru Road, near the metro entrance"
            onChange={(e) => {
              setManual(e.target.value);
              setStatus("");
            }}
          />
        </label>
        <div className="ride-actions">
          {shareable && (
            <button
              className="button"
              disabled={!text}
              onClick={() => share(false)}
            >
              <Share2 size={16} /> Share location
            </button>
          )}
          <button
            className="button"
            disabled={!text}
            onClick={() => share(true)}
          >
            <Copy size={16} /> Copy location
          </button>
        </div>
        {text && (
          <details
            className="ride-detail"
            open={status.startsWith("Select and copy") || undefined}
          >
            <summary>Location text to share</summary>
            <p>{text}</p>
          </details>
        )}
        <details className="ride-detail">
          <summary>Trusted emergency contact</summary>
          <label className="field" htmlFor="trusted-phone">
            Phone number
            <input
              id="trusted-phone"
              type="tel"
              autoComplete="off"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <button className="button" onClick={saveContact}>
            {phone.trim() ? "Save trusted contact" : "Remove trusted contact"}
          </button>
        </details>
        <p role="status">{status}</p>
        <h3>If there’s an emergency</h3>
        <ul>
          <li>Move to a safe place if possible.</li>
          <li>Contact emergency services.</li>
          <li>Share the incident location.</li>
          <li>Stay out of moving traffic.</li>
        </ul>
      </Panel>
    </div>
  );
}
