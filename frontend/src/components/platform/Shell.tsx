"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  ChartNoAxesCombined,
  ChevronRight,
  Command,
  FileBarChart2,
  FlaskConical,
  Gauge,
  History,
  Layers,
  MapPinned,
  Menu,
  MoonStar,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useHealth, Status } from "./ui";

const navigation = [
  { name: "Command center", href: "/", icon: Gauge, section: "WORKSPACE" },
  { name: "Prediction", href: "/predict", icon: SlidersHorizontal },
  { name: "Scenario comparison", href: "/what-if", icon: FlaskConical },
  { name: "Batch processing", href: "/batch", icon: Layers },
  {
    name: "Explanations",
    href: "/explain",
    icon: Activity,
    section: "INTELLIGENCE",
  },
  { name: "Great Britain map", href: "/map", icon: MapPinned },
  { name: "Analytics", href: "/analytics", icon: ChartNoAxesCombined },
  { name: "Prediction history", href: "/history", icon: History },
  {
    name: "Model card",
    href: "/model-card",
    icon: FileBarChart2,
    section: "RESOURCES",
  },
  { name: "Documentation", href: "/about", icon: BookOpen },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    health = useHealth();
  const [mobile, setMobile] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [search, setSearch] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    onboarding = useRef<HTMLDialogElement>(null);
  const active =
    navigation.find((item) => item.href === path)?.name || "Workspace";
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        dialog.current?.showModal();
      }
    };
    window.addEventListener("keydown", keyboard);
    if (!localStorage.getItem("roadsentinel-onboarded"))
      onboarding.current?.showModal();
    return () => window.removeEventListener("keydown", keyboard);
  }, []);
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {mobile && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        className={`sidebar ${mobile ? "open" : ""}`}
        aria-label="Main navigation"
      >
        <Link className="brand" href="/" onClick={() => setMobile(false)}>
          <span className="brand-mark">
            <ShieldCheck size={24} />
          </span>
          <span className="brand-name">
            RoadSentinel<small>ROAD INTELLIGENCE</small>
          </span>
        </Link>
        <nav>
          {navigation.map((item) => (
            <div key={item.href}>
              {item.section && (
                <p className="nav-section">{collapsed ? "—" : item.section}</p>
              )}
              <Link
                title={item.name}
                className={`nav-item ${path === item.href ? "active" : ""}`}
                aria-current={path === item.href ? "page" : undefined}
                href={item.href}
                onClick={() => setMobile(false)}
              >
                <item.icon size={18} />
                <span>{item.name}</span>
                {path === item.href && <span className="active-dot" />}
              </Link>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="model-mini">
            <span className="eyebrow">MODEL INTEGRITY</span>
            <strong>Documented STATS19 model</strong>
            <p>Real inference. Transparent limits.</p>
            <Link href="/model-card">
              Inspect model card <ArrowUpRight size={14} />
            </Link>
          </div>
          <button
            className="collapse-button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          >
            <Menu size={16} />
            <span>Collapse navigation</span>
          </button>
        </div>
      </aside>
      <div className="workspace">
        <div className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              aria-expanded={mobile}
              aria-label="Open navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            <ShieldCheck size={15} />
            <span>RoadSentinel</span>
            <ChevronRight size={13} />
            <strong>{active}</strong>
          </div>
          <div className="topbar-actions">
            <Status tone={health.data?.ready ? "good" : "warn"}>
              {health.isPending
                ? "Connecting"
                : health.data?.ready
                  ? "Model online"
                  : "API unavailable"}
            </Status>
            <button
              className="command-button"
              onClick={() => dialog.current?.showModal()}
              aria-label="Open command palette"
            >
              <Search size={15} />
              <span>Search workspace</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="icon-button"
              aria-label="Toggle light or dark theme"
              onClick={() => {
                const root = document.documentElement;
                const next = root.dataset.theme === "light" ? "dark" : "light";
                root.dataset.theme = next;
                localStorage.setItem("roadsentinel-theme", next);
              }}
            >
              <MoonStar size={18} />
            </button>
          </div>
        </div>
        <main id="main-content" className="main-content">
          {children}
        </main>
        <footer className="app-footer">
          <span>
            <ShieldCheck size={13} /> RoadSentinel · Research & demonstration
          </span>
          <span>Model estimates are not safety guarantees.</span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Mobile shortcuts">
        {navigation
          .filter((n) =>
            ["/", "/predict", "/what-if", "/history"].includes(n.href),
          )
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={path === item.href ? "page" : undefined}
            >
              <item.icon size={19} />
              <span>
                {item.name === "Command center"
                  ? "Overview"
                  : item.name === "Scenario comparison"
                    ? "Compare"
                    : item.name === "Prediction history"
                      ? "History"
                      : item.name}
              </span>
            </Link>
          ))}
      </nav>
      <dialog ref={dialog} className="command-dialog">
        <div className="dialog-title">
          <Command size={20} />
          <strong>Go anywhere</strong>
          <button
            className="icon-button"
            aria-label="Close command palette"
            onClick={() => dialog.current?.close()}
          >
            <X size={18} />
          </button>
        </div>
        <label className="sr-only" htmlFor="command-search">
          Search pages
        </label>
        <input
          id="command-search"
          className="command-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search pages and tools…"
          autoComplete="off"
        />
        <div className="command-results">
          {navigation
            .filter((n) => n.name.toLowerCase().includes(search.toLowerCase()))
            .map((n) => (
              <Link
                href={n.href}
                key={n.href}
                onClick={() => dialog.current?.close()}
              >
                <n.icon size={18} />
                {n.name}
                <ChevronRight size={15} />
              </Link>
            ))}
        </div>
      </dialog>
      <dialog ref={onboarding} className="onboarding-dialog">
        <span className="brand-mark">
          <ShieldCheck size={25} />
        </span>
        <p className="eyebrow">WELCOME TO ROADSENTINEL</p>
        <h2>
          Explore the model.
          <br />
          Understand its limits.
        </h2>
        <p>
          Build a road-condition scenario, compare injury severity estimates,
          and explore what influenced them. Saved history is temporary.
        </p>
        <div className="notice">
          <div>
            This model uses documented Great Britain collision records and mph
            speed limits. It does not estimate the chance of a crash. It missed
            all serious and fatal outcomes as top predictions in testing; never
            use it to judge safety.
          </div>
        </div>
        <button
          className="button primary"
          onClick={() => {
            localStorage.setItem("roadsentinel-onboarded", "true");
            onboarding.current?.close();
          }}
        >
          Open command center <ChevronRight size={16} />
        </button>
      </dialog>
    </div>
  );
}
