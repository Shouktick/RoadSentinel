"use client";
import Link from "next/link";
import { Gauge, Navigation, Octagon, Phone, Flag } from "lucide-react";
import { PageTitle } from "./ui";
import SpeedDial from "./SpeedDial";
import { useRideGps } from "./useRideGps";
import RideEmergency from "./RideEmergency";
import JourneyContext from "./JourneyContext";
import RoadReport from "./RoadReport";
import "./speed-explorer.css";
import "./passenger.css";

export default function PassengerMonitor() {
  const gps = useRideGps();
  const measurement = gps.measurement;
  return (
    <div className="page-stack speed-explorer passenger-monitor">
      <PageTitle
        eyebrow="INDIA / SPEED EXPLORER"
        title="Passenger road safety monitor"
        description="Start monitoring to let this tab use your location for speed. GPS readings stay on your device."
      />
      <nav className="ride-shortcuts" aria-label="Passenger tools">
        <a href="#ride-report">
          <Flag size={16} /> Report conditions
        </a>
        <a href="#ride-help">
          <Phone size={16} /> Emergency help
        </a>
      </nav>
      <section
        className="speed-cluster ride-cluster"
        aria-label="Passenger speed monitor"
      >
        <div className="speed-instrument">
          <div className="ride-dial-heading">
            <h2>
              <Gauge size={18} /> GPS speed
            </h2>
            <button
              className="button primary"
              onClick={gps.active ? () => gps.stop() : gps.start}
            >
              {gps.active ? <Octagon size={17} /> : <Navigation size={17} />}{" "}
              {gps.active ? "Stop monitoring" : "Start monitoring"}
            </button>
          </div>
          <SpeedDial speed={gps.reading ? Math.round(gps.reading.kmh) : null} />
          <p className="ride-source">
            {gps.reading
              ? gps.reading.source +
                " · " +
                new Date(gps.reading.at).toLocaleTimeString()
              : "Speed unavailable"}
          </p>
        </div>
        <div className="ride-telemetry">
          <h2>Ride status</h2>
          <p className="ride-signal" role="status">
            {gps.message}
          </p>
          <dl>
            <div>
              <dt>Last fix accuracy</dt>
              <dd>
                {measurement && Number.isFinite(measurement.accuracy)
                  ? "±" + Math.round(measurement.accuracy) + " m"
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Last GPS update</dt>
              <dd>
                {measurement
                  ? new Date(measurement.at).toLocaleTimeString()
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Road speed limit</dt>
              <dd>Speed limit data unavailable</dd>
            </div>
          </dl>
          <p>
            GPS estimates can differ from the dashboard. Keep this tab visible
            while monitoring.
          </p>
        </div>
      </section>
      <JourneyContext fix={gps.fix} />
      <div className="ride-tools">
        <RoadReport />
        <RideEmergency
          fix={gps.fix}
          lastFix={gps.lastFix}
          active={gps.active}
          start={gps.start}
        />
      </div>
      <Link className="ride-education" href="/stopping-distance">
        Explore stopping distance in the physics calculator →
      </Link>
    </div>
  );
}
