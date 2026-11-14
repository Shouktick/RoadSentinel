import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RoadSentinel",
    short_name: "RoadSentinel",
    description:
      "Official Indian state and union territory road accident statistics.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d1114",
    theme_color: "#0d1114",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
