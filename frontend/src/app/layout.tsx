import type { Metadata } from "next";
import "./roadsentinel.css";
import Providers from "@/components/platform/Providers";
import Shell from "@/components/platform/Shell";
export const metadata: Metadata = {
  title: {
    default: "RoadSentinel | Road Intelligence",
    template: "%s | RoadSentinel",
  },
  description:
    "Explore official Indian state and union territory road accident statistics, annual trends and regional maps. Severity prediction is unavailable.",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  manifest: "/manifest.webmanifest",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem('roadsentinel-theme')||'dark'}catch{}`,
          }}
        />
      </head>
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
