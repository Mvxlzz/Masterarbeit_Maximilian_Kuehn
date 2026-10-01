"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Boxes,
  ChevronDown,
  ChevronsLeftRight,
  FileSpreadsheet,
  Layers,
  Library,
  Moon,
  Network,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { ExportMenue } from "@/components/export-menue";
import { Logo } from "@/components/logo";
import { KontoMenue, Speicherwolke } from "@/components/konto-menue";
import { useAktivesSzenario, useProjekte } from "@/components/projekte-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { szenarienKurz, szenarioTitel } from "@/lib/projekte";

const SIDEBAR_MODUS_SCHLUESSEL = "w1-sidebar-mode";

type SidebarModus = "hover" | "expanded" | "collapsed";

const NAV: {
  href: string;
  /** Pfadpräfix, unter dem der Eintrag aktiv ist (Standard: href). */
  bereich?: string;
  label: string;
  icon: typeof Boxes;
  aktiv: boolean;
}[] = [
  { href: "/projekte", label: "Projekte", icon: Boxes, aktiv: true },
  { href: "/einfuehrung", label: "Einführung", icon: BookOpen, aktiv: true },
  { href: "/fall/datenblatt", bereich: "/fall", label: "Fall bearbeiten", icon: FileSpreadsheet, aktiv: true },
  { href: "/ergebnis", label: "Ergebnis", icon: BarChart3, aktiv: true },
  { href: "/sensitivitaet", label: "Sensitivität", icon: Activity, aktiv: true },
  { href: "/szenarien/matrix", bereich: "/szenarien", label: "Szenarien", icon: Layers, aktiv: true },
  {
    href: "/blaetter/methode",
    bereich: "/blaetter",
    label: "Formel- und Datenblätter",
    icon: Library,
    aktiv: true,
  },
];

export type SubnavGruppe = {
  label: string;
  eintraege: { id: string; label: string; href?: string }[];
};

function Themenumschalter() {
  const { resolvedTheme, setTheme } = useTheme();
  const [angezeigt, setAngezeigt] = useState(false);
  // Erst nach dem Mount anzeigen (next-themes kennt das echte Theme erst client-seitig).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAngezeigt(true);
  }, []);
  return (
    <button
      type="button"
      title="Hell oder dunkel"
      aria-label="Zwischen hell und dunkel umschalten"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="grid size-7 shrink-0 place-items-center rounded-md border border-border bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {angezeigt && (resolvedTheme === "dark" ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />)}
    </button>
  );
}

function Projektpfad() {
  const { projekte, offenId, offenesProjekt, oeffnen } = useProjekte();
  return (
    <nav aria-label="Pfad" className="flex min-w-0 items-center gap-1 text-sm">
      <Link
        href="/projekte"
        className="rounded-md px-1.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        Projekte
      </Link>
      {offenId && (
        <>
          <span aria-hidden className="px-0.5 text-border">
            /
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex min-w-0 max-w-[280px] items-center gap-2 rounded-md px-1.5 py-1 font-medium hover:bg-accent">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <Boxes className="size-3.5" />
              </span>
              <span className="truncate">{offenesProjekt?.name ?? "Projekt wählen"}</span>
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Projekt wechseln</DropdownMenuLabel>
                {projekte.map((p) => (
                  <DropdownMenuItem key={p.id} onClick={() => oeffnen(p.id)}>
                    {p.id === offenId && (
                      <span className="size-1.5 rounded-full bg-primary" />
                    )}
                    <span className={cn(p.id !== offenId && "pl-3.5", "truncate")}>{p.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/projekte" />}>
                Alle Projekte
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Speicherwolke />
          <span aria-hidden className="px-0.5 text-border">
            /
          </span>
          <SzenarioUmschalter />
        </>
      )}
    </nav>
  );
}

const BASISFALL = "__basisfall__";

/**
 * Szenario-Wahl im Pfad: Basisfall oder ein Szenario der Fall-Datei, gemerkt je Projekt.
 * Ergebnis, Sensitivität und die Bausteinwerte folgen ihr. Vorbild: Branch-Umschalter im Supabase-Pfad.
 */
function SzenarioUmschalter() {
  const { offenesProjekt, ladeProjektdatei } = useProjekte();
  const { szenario, setzen } = useAktivesSzenario();
  const datei = offenesProjekt?.datei;
  const liste = szenarienKurz(datei);
  const titel = szenarioTitel(szenario, datei);
  return (
    <DropdownMenu
      onOpenChange={(offen) => {
        if (offen && offenesProjekt && !datei) void ladeProjektdatei(offenesProjekt.id);
      }}
    >
      <DropdownMenuTrigger
        data-testid="szenario-umschalter"
        aria-label={`Aktives Szenario: ${titel}. Szenario wechseln`}
        title="Aktives Szenario für Ergebnis und Sensitivität"
        className="inline-flex h-6 max-w-[300px] items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 font-mono text-[11px] font-medium uppercase text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <span className="truncate">{titel}</span>
        <ChevronDown className="size-3 shrink-0" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[70vh] w-80 overflow-y-auto">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Szenario für Ergebnis und Sensitivität</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={szenario ?? BASISFALL}
            onValueChange={(v) => setzen(v === BASISFALL ? null : String(v))}
          >
            <DropdownMenuRadioItem value={BASISFALL} closeOnClick>
              <span className="w-9 shrink-0" aria-hidden />
              Basisfall
              <span className="ml-auto pl-3 text-xs text-muted-foreground">ohne Einflussfaktoren</span>
            </DropdownMenuRadioItem>
            {liste.map((s) => (
              <DropdownMenuRadioItem key={s.schluessel} value={s.schluessel} closeOnClick>
                <span className="w-9 shrink-0 font-mono text-xs text-muted-foreground">{s.schluessel}</span>
                <span className="truncate">{s.name}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/szenarien/matrix" />}>Szenarien verwalten</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarMenu({
  modus,
  onModusChange,
  onOpenChange,
}: {
  modus: SidebarModus;
  onModusChange: (m: SidebarModus) => void;
  onOpenChange: (offen: boolean) => void;
}) {
  const OPTIONEN: { wert: SidebarModus; label: string }[] = [
    { wert: "expanded", label: "Ausgeklappt" },
    { wert: "collapsed", label: "Eingeklappt" },
    { wert: "hover", label: "Bei Zeiger ausklappen" },
  ];
  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        title="Seitenleiste steuern"
        className="flex h-9 w-full items-center gap-2.5 overflow-hidden rounded-md px-2 text-muted-foreground hover:bg-accent hover:text-foreground data-popup-open:bg-accent data-popup-open:text-primary"
      >
        <ChevronsLeftRight className="size-4 shrink-0" />
        <span className="sidebar-label truncate text-xs">Seitenleiste</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Seitenleiste</DropdownMenuLabel>
          {OPTIONEN.map((o) => (
            <DropdownMenuItem key={o.wert} onClick={() => onModusChange(o.wert)}>
              {modus === o.wert && <span className="size-1.5 rounded-full bg-primary" />}
              <span className={cn(modus !== o.wert && "pl-3.5")}>{o.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SeitenleisteSzenario() {
  const { offenesProjekt } = useProjekte();
  const { szenario } = useAktivesSzenario();
  return <>{szenarioTitel(szenario, offenesProjekt?.datei)}</>;
}

function Sidebar({ pathname }: { pathname: string }) {
  const { offenesProjekt } = useProjekte();
  const [modus, setModus] = useState<SidebarModus>("hover");
  const [hovering, setHovering] = useState(false);
  const [locked, setLocked] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const gespeichert = localStorage.getItem(SIDEBAR_MODUS_SCHLUESSEL);
      if (gespeichert === "hover" || gespeichert === "expanded" || gespeichert === "collapsed") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setModus(gespeichert);
      }
    } catch {
      // Gastmodus ohne Speicher
    }
  }, []);

  const modusSetzen = useCallback((m: SidebarModus) => {
    setModus(m);
    setLocked(m === "hover");
    try {
      localStorage.setItem(SIDEBAR_MODUS_SCHLUESSEL, m);
    } catch {
      // ignorieren
    }
  }, []);

  const wide =
    modus === "expanded" || menuOpen || (modus === "hover" && hovering && !locked);

  return (
    <aside
      aria-label="Hauptnavigation"
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => {
        setHovering(false);
        if (modus === "hover" && !menuOpen) setLocked(false);
      }}
      className={cn(
        "relative z-30 flex h-full shrink-0 flex-col border-r border-border bg-sidebar py-3 transition-[width] duration-200",
        wide ? "w-60" : "w-14"
      )}
    >
      <div className="mb-2 flex items-start gap-2.5 px-3">
        <Link
          href="/"
          title="Startseite"
          className="shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo titel="Startseite" />
        </Link>
        {wide && (
          <span className="pt-1 text-[13px] font-semibold leading-tight text-foreground">
            Wiederaufbereitung
            <br />
            Alternativen
          </span>
        )}
      </div>

      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {NAV.map((item) => {
          const bereich = item.bereich ?? item.href;
          const istAktiv = pathname === bereich || pathname.startsWith(`${bereich}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                title={item.label}
                onClick={() => {
                  if (modus === "hover") setLocked(true);
                }}
                className={cn(
                  "flex h-9 items-center gap-3 rounded-md px-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
                  istAktiv && "bg-accent font-medium text-primary"
                )}
                aria-current={istAktiv ? "page" : undefined}
              >
                <Icon className="size-[18px] shrink-0" strokeWidth={1.6} />
                {wide && <span className="truncate">{item.label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2 border-t border-border px-2 pt-2.5">
        {wide && (
          <div className="px-1.5 text-xs text-muted-foreground">
            {offenesProjekt ? (
              <>
                <strong className="block font-medium text-foreground">{offenesProjekt.name}</strong>
                <SeitenleisteSzenario />
              </>
            ) : (
              <>
                <strong className="block font-medium text-foreground">Kein Projekt geöffnet</strong>
                Projekt wählen oder anlegen
              </>
            )}
          </div>
        )}
        <Link
          href="/architektur"
          prefetch={false}
          title="Architektur"
          onClick={() => {
            if (modus === "hover") setLocked(true);
          }}
          aria-current={pathname.startsWith("/architektur") ? "page" : undefined}
          className={cn(
            "flex h-9 items-center gap-3 overflow-hidden rounded-md px-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
            pathname.startsWith("/architektur") && "bg-accent font-medium text-primary"
          )}
        >
          <Network className="size-[18px] shrink-0" strokeWidth={1.6} />
          {wide && <span className="truncate">Architektur</span>}
        </Link>
        <SidebarMenu modus={modus} onModusChange={modusSetzen} onOpenChange={setMenuOpen} />
      </div>
    </aside>
  );
}

function Subnav({ titel, gruppen }: { titel: string; gruppen: SubnavGruppe[] }) {
  const pathname = usePathname();
  const hashIds = useMemo(
    () => gruppen.flatMap((g) => g.eintraege.filter((e) => !e.href).map((e) => e.id)),
    [gruppen]
  );
  const ersterHash = hashIds[0] ?? null;
  const [aktivHash, setAktivHash] = useState<string | null>(ersterHash);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAktivHash(hashIds[0] ?? null);
  }, [hashIds, pathname]);

  useEffect(() => {
    if (hashIds.length === 0) return;
    const main = document.querySelector("main");
    if (!main) return;

    let observer: IntersectionObserver | null = null;
    const sichtbarkeit = new Map<string, number>();

    const verbinden = (): boolean => {
      const beobachtete = hashIds
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => el != null);
      if (beobachtete.length === 0) return false;
      observer?.disconnect();
      observer = new IntersectionObserver(
        (eintraege) => {
          for (const e of eintraege) {
            sichtbarkeit.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
          }
          let bestId: string | null = null;
          let bestRatio = -1;
          for (const id of hashIds) {
            const r = sichtbarkeit.get(id) ?? 0;
            if (r > bestRatio) {
              bestRatio = r;
              bestId = id;
            }
          }
          if (bestId && bestRatio > 0) setAktivHash(bestId);
        },
        {
          root: main,
          // Band nahe am oberen Rand der Scrollfläche: Abschnitt dort gilt als aktiv.
          rootMargin: "-12% 0px -55% 0px",
          threshold: [0, 0.05, 0.15, 0.35, 0.55, 1],
        }
      );
      for (const el of beobachtete) observer.observe(el);
      return true;
    };

    if (verbinden()) {
      return () => observer?.disconnect();
    }

    const mo = new MutationObserver(() => {
      if (verbinden()) mo.disconnect();
    });
    mo.observe(main, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      observer?.disconnect();
    };
  }, [hashIds, pathname]);

  return (
    <aside className="hidden w-[220px] shrink-0 flex-col overflow-y-auto border-r border-border bg-card px-3 py-4 lg:flex">
      <h2 className="mb-4 px-2 text-base font-semibold">{titel}</h2>
      {gruppen.map((g) => (
        <div key={g.label} className="mb-4">
          <div className="px-2 pb-1.5 font-mono text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {g.label}
          </div>
          <ul>
            {g.eintraege.map((e) => {
              const istRoute = Boolean(e.href);
              const aktiv = istRoute
                ? pathname === e.href || pathname.startsWith(`${e.href}/`)
                : aktivHash === e.id;
              const klasse = cn(
                "block rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
                aktiv && "bg-accent font-semibold text-foreground"
              );
              if (e.href) {
                return (
                  <li key={e.id}>
                    <Link href={e.href} aria-current={aktiv ? "page" : undefined} className={klasse}>
                      {e.label}
                    </Link>
                  </li>
                );
              }
              return (
                <li key={e.id}>
                  <a
                    href={`#${e.id}`}
                    aria-current={aktiv ? "page" : undefined}
                    onClick={(ev) => {
                      const ziel = document.getElementById(e.id);
                      if (ziel) {
                        ev.preventDefault();
                        setAktivHash(e.id);
                        ziel.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }}
                    className={klasse}
                  >
                    {e.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}

export function AppShell({
  subnav,
  seitenspalte,
  panel,
  kopfAktionen,
  children,
}: {
  subnav?: { titel: string; gruppen: SubnavGruppe[] };
  /** Eigene zweite Spalte statt `subnav`, z. B. die Stationsliste der Einführung. */
  seitenspalte?: ReactNode;
  panel?: ReactNode;
  kopfAktionen?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();

  const projektlisteHinweis = useMemo(() => pathname === "/projekte", [pathname]);

  return (
    <div className="flex h-screen min-w-[1024px] overflow-hidden bg-background text-foreground">
      <Sidebar pathname={pathname} />
      {subnav && <Subnav titel={subnav.titel} gruppen={subnav.gruppen} />}
      {seitenspalte && (
        <aside className="hidden w-[240px] shrink-0 flex-col overflow-y-auto border-r border-border bg-card px-3 py-4 lg:flex">
          {seitenspalte}
        </aside>
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-5">
          {projektlisteHinweis ? (
            <span className="text-sm text-muted-foreground">Projekte</span>
          ) : pathname.startsWith("/architektur") ? (
            <span className="text-sm text-muted-foreground">Architektur</span>
          ) : pathname.startsWith("/einfuehrung") ? (
            <nav aria-label="Pfad" className="flex items-center gap-1 text-sm">
              <Link
                href="/projekte"
                className="rounded-md px-1.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Projekte
              </Link>
              <span aria-hidden className="px-0.5 text-border">
                /
              </span>
              <span className="px-1.5 font-medium">Einführung</span>
              <span className="ml-2 inline-flex h-5 items-center rounded-full border border-border bg-secondary px-2 font-mono text-[11px] font-medium uppercase text-muted-foreground">
                Referenzfall · nur lesend
              </span>
            </nav>
          ) : (
            <Projektpfad />
          )}
          <div className="ml-auto flex items-center gap-2">
            {kopfAktionen}
            {!projektlisteHinweis &&
              !pathname.startsWith("/einfuehrung") &&
              !pathname.startsWith("/architektur") && <ExportMenue />}
            <KontoMenue />
            <Themenumschalter />
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-background px-6 py-5">{children}</main>
      </div>
      {panel && (
        <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-l border-border bg-card px-4 py-4 xl:block">
          {panel}
        </aside>
      )}
    </div>
  );
}
