"use client";

import "@xyflow/react/dist/style.css";

import { memo, useMemo, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  Activity,
  BookOpen,
  Braces,
  Cloud,
  FileJson,
  FlaskConical,
  PanelsTopLeft,
  Route,
  ShieldCheck,
  Sigma,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import {
  ABB,
  ABB_BAUSTEINE,
  ABB_GRUPPEN,
  BREITE,
  GRUPPEN,
  GRUPPEN_GRIFFE,
  KOPF_HOEHE,
  ZEILE_HOEHE,
  fuerDarstellung,
  type Baustein,
  type Gruppe,
  type Symbol,
} from "@/lib/architektur";
import { cn } from "@/lib/utils";

/** `app`: Website mit Tokens hell/dunkel. `abbildung`: schwarz-weiß für die Arbeit (Kapitel 5). */
export type Stil = "app" | "abbildung";

const SYMBOLE: Record<Symbol, LucideIcon> = {
  seiten: PanelsTopLeft,
  querschnitt: Wrench,
  endpunkte: Route,
  vertrag: ShieldCheck,
  modell: Braces,
  auswertung: Sigma,
  sensitivitaet: Activity,
  datei: FileJson,
  referenz: FlaskConical,
  arbeit: BookOpen,
  konten: Cloud,
};

// Unsichtbare Griffe: nur Ankerpunkte der Linien, nicht verbindbar
const GRIFF = "!size-1 !min-h-0 !min-w-0 !border-0 !bg-transparent !opacity-0";

/** Maße je Darstellung: Kopf- und Zeilenhöhe, Lage der senkrechten Verbindungen, Höhe des Gruppenkopfs. */
type Masse = { kopf: number; zeile: number; griffe: Record<"l" | "r", number>; gruppeKopf: number };
const MASSE: Record<Stil, Masse> = {
  app: { kopf: KOPF_HOEHE, zeile: ZEILE_HOEHE, griffe: GRUPPEN_GRIFFE, gruppeKopf: 44 },
  abbildung: { kopf: ABB.kopf, zeile: ABB.zeile, griffe: ABB.griffe, gruppeKopf: ABB.gruppeKopf },
};

type GruppeDaten = { gruppe: Gruppe; stil: Stil };
type BausteinDaten = { baustein: Baustein; stil: Stil; gewaehlt: boolean; aktiv: boolean };

const GruppeKnoten = memo(function GruppeKnoten({ data }: NodeProps<Node<GruppeDaten>>) {
  const { gruppe, stil } = data;
  const abb = stil === "abbildung";
  const m = MASSE[stil];
  return (
    <div
      className={cn(
        "h-full w-full",
        abb
          ? cn(
              "border-black bg-white",
              gruppe.rand === "kern" ? "border-[1.6px]" : "border",
              gruppe.rand === "gestrichelt" && "border-dashed",
              gruppe.rand === "gepunktet" && "border-dotted"
            )
          : cn(
              "rounded-lg",
              gruppe.rand === "kern"
                ? "border-[1.5px] border-[var(--primaer)] bg-[var(--marke-tint)]"
                : "border border-dashed border-[var(--linie-stark)]",
              gruppe.rand === "gepunktet" && "border-dotted"
            )
      )}
    >
      <div className={cn("flex items-baseline", abb ? "gap-2.5 px-5 pt-2.5 text-black" : "gap-2 px-6 pt-3.5")}>
        <span
          className={cn(
            abb
              ? "text-[21px] font-bold tracking-normal"
              : "font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-gedaempft)]",
            !abb && gruppe.rand === "kern" && "text-[var(--primaer)]"
          )}
        >
          {gruppe.titel}
        </span>
        <span className={cn(abb ? "text-[15px] text-black" : "text-xs text-[var(--text-dritt)]")}>
          {gruppe.zusatz}
        </span>
      </div>
      {(["l", "r"] as const).map((seite) => (
        <span key={seite}>
          <Handle
            id={`oben-${seite}`}
            type="source"
            position={Position.Top}
            isConnectable={false}
            className={GRIFF}
            style={{ left: m.griffe[seite] }}
          />
          <Handle
            id={`unten-${seite}`}
            type="source"
            position={Position.Bottom}
            isConnectable={false}
            className={GRIFF}
            style={{ left: m.griffe[seite] }}
          />
        </span>
      ))}
      <Handle
        id="rechts"
        type="source"
        position={Position.Right}
        isConnectable={false}
        className={GRIFF}
        style={{ top: m.gruppeKopf + m.kopf / 2 }}
      />
    </div>
  );
});

const BausteinKnoten = memo(function BausteinKnoten({ data }: NodeProps<Node<BausteinDaten>>) {
  const { baustein: b, stil, gewaehlt, aktiv } = data;
  const abb = stil === "abbildung";
  const m = MASSE[stil];
  const Icon = SYMBOLE[b.symbol];
  return (
    <div
      className={cn(
        "h-full w-full overflow-hidden",
        abb
          ? cn("border border-black bg-white text-black", b.hervorgehoben && "border-[1.6px]")
          : cn(
              "rounded-md border bg-[var(--flaeche)] text-[var(--text)] transition-shadow",
              b.optional ? "border-dashed border-[var(--linie-stark)]" : "border-[var(--linie-stark)]",
              b.hervorgehoben && "border-[var(--primaer)]",
              gewaehlt && "ring-2 ring-[var(--primaer)] ring-offset-2 ring-offset-[var(--flaeche-seite)]",
              aktiv && "border-[var(--primaer)] shadow-[0_0_0_3px_var(--marke-tint)]"
            )
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-3",
          abb ? "border-b border-black" : "border-b border-[var(--linie)] bg-[var(--flaeche-zweit)]"
        )}
        style={{ height: m.kopf }}
      >
        {!abb && <Icon className="size-4 shrink-0 text-[var(--text-gedaempft)]" strokeWidth={1.6} aria-hidden />}
        <span className={cn("truncate", abb ? "text-[17px] font-bold" : "text-[14px] font-medium")}>{b.titel}</span>
      </div>
      <ul>
        {b.zeilen.map((z, i) => (
          <li
            key={z.id}
            className={cn(
              "flex items-center gap-2 px-3",
              i > 0 && (abb ? "border-t border-black/25" : "border-t border-[var(--linie)]")
            )}
            style={{ height: m.zeile }}
          >
            {!abb && (
              <span
                aria-hidden
                className={cn("text-[9px] leading-none", z.zentral ? "text-[var(--text)]" : "text-[var(--text-dritt)]")}
              >
                {z.zentral ? "◆" : "◇"}
              </span>
            )}
            <span className={cn("min-w-0 flex-1 truncate", abb ? "text-[16px] leading-none" : "text-[13px]")}>
              {z.text}
            </span>
            {z.art && (
              <span
                className={cn(
                  "shrink-0 font-mono",
                  abb ? "text-[14px] leading-none text-black" : "text-[11px] text-[var(--text-dritt)]"
                )}
              >
                {z.art}
              </span>
            )}
          </li>
        ))}
      </ul>
      {(["oben", "unten", "links", "rechts"] as const).map((seite) => (
        <Handle
          key={seite}
          id={seite}
          type="source"
          isConnectable={false}
          className={GRIFF}
          position={
            seite === "oben"
              ? Position.Top
              : seite === "unten"
                ? Position.Bottom
                : seite === "links"
                  ? Position.Left
                  : Position.Right
          }
          style={
            seite === "links" || seite === "rechts"
              ? { top: m.kopf / 2 }
              : b.griff !== undefined
                ? { left: `${b.griff * 100}%` }
                : undefined
          }
        />
      ))}
    </div>
  );
});

const KNOTEN_TYPEN = { gruppe: GruppeKnoten, baustein: BausteinKnoten };

const DEUTSCH = {
  "node.a11yDescription.default": "Mit Eingabe oder Leertaste wählen Sie einen Baustein und sehen rechts seine Erklärung.",
  "node.a11yDescription.keyboardDisabled": "Mit Eingabe oder Leertaste wählen Sie einen Baustein.",
  "edge.a11yDescription.default": "Verbindung zwischen zwei Bausteinen.",
  "controls.ariaLabel": "Ansicht steuern",
  "controls.zoomIn.ariaLabel": "Vergrößern",
  "controls.zoomOut.ariaLabel": "Verkleinern",
  "controls.fitView.ariaLabel": "Ganzes Diagramm einpassen",
  "controls.interactive.ariaLabel": "Bedienung sperren",
  "minimap.ariaLabel": "Übersichtskarte",
  "handle.ariaLabel": "Anschluss",
};

export function knotenUndKanten(
  stil: Stil,
  gewaehlt: string | null,
  durchlauf: { aktiv: string | null; erledigt: string[] }
): { nodes: Node[]; edges: Edge[] } {
  const abb = stil === "abbildung";
  const { verbindungen } = fuerDarstellung(!abb);
  const bausteine = abb ? ABB_BAUSTEINE : fuerDarstellung(true).bausteine;
  const gruppen = abb ? ABB_GRUPPEN : GRUPPEN;
  const m = MASSE[stil];
  const gruppenY = Object.fromEntries(gruppen.map((g) => [g.id, g.y]));

  const nodes: Node[] = [
    ...gruppen.map<Node>((g) => ({
      id: g.id,
      type: "gruppe",
      position: { x: 0, y: g.y },
      width: g.breite,
      height: g.hoehe,
      data: { gruppe: g, stil },
      selectable: false,
      focusable: false,
      draggable: false,
      zIndex: 0,
    })),
    ...bausteine.map<Node>((b) => ({
      id: b.id,
      type: "baustein",
      ...(b.gruppe ? { parentId: b.gruppe, extent: "parent" as const } : {}),
      position: { x: b.x, y: b.gruppe ? b.y : (gruppenY.oberflaeche ?? 0) + b.y },
      width: b.breite,
      height: m.kopf + b.zeilen.length * m.zeile + 2,
      data: {
        baustein: b,
        stil,
        gewaehlt: gewaehlt === b.id,
        aktiv:
          (durchlauf.aktiv === "modell-auswertung" && (b.id === "fallmodell" || b.id === "auswertung")) ||
          (durchlauf.aktiv === "anfrage" && b.id === "bewertung-endpunkte") ||
          (durchlauf.aktiv === "fallmodell" && b.id === "auswertung"),
      },
      ariaLabel: `${b.titel}: ${b.zeilen.map((z) => z.text).join(", ")}`,
      selectable: !abb,
      focusable: !abb,
      draggable: false,
      zIndex: 1,
    })),
  ];

  const linie = abb ? "#000" : "var(--text-gedaempft)";
  const edges: Edge[] = verbindungen.map((v) => {
    const leuchtet = durchlauf.aktiv === v.id;
    const war = durchlauf.erledigt.includes(v.id);
    const farbe = leuchtet || war ? "var(--primaer)" : linie;
    const pfeil = { type: MarkerType.ArrowClosed, width: 14, height: 14, color: farbe };
    const senkrecht = v.vonGriff.startsWith("oben") || v.vonGriff.startsWith("unten");
    return {
      id: v.id,
      source: v.von,
      sourceHandle: v.vonGriff,
      target: v.nach,
      targetHandle: v.nachGriff,
      type: senkrecht && v.von !== "falldatei" && v.von !== "referenzimplementierung" ? "straight" : "smoothstep",
      label: v.text,
      animated: leuchtet,
      markerEnd: pfeil,
      markerStart: v.beidseitig ? pfeil : undefined,
      focusable: false,
      selectable: false,
      zIndex: 2,
      style: {
        stroke: farbe,
        strokeWidth: abb ? 1 : leuchtet ? 2.25 : 1.5,
        strokeDasharray: v.gestrichelt ? "5 4" : undefined,
      },
      labelStyle: abb
        ? { fill: "#000", fontSize: 15, fontFamily: "var(--font-sans)" }
        : { fill: leuchtet ? "var(--primaer)" : "var(--text-gedaempft)", fontSize: 11, fontFamily: "var(--font-mono)" },
      labelShowBg: true,
      labelBgStyle: abb
        ? { fill: "#fff" }
        : { fill: "var(--flaeche)", stroke: leuchtet ? "var(--primaer)" : "var(--linie-stark)", strokeWidth: 1 },
      labelBgPadding: abb ? ([4, 2] as [number, number]) : ([8, 4] as [number, number]),
      labelBgBorderRadius: abb ? 0 : 999,
    };
  });

  return { nodes, edges };
}

/**
 * Interaktives Architekturdiagramm mit React Flow: nicht verschiebbar und nicht verbindbar, es erklärt nur.
 * Ein Klick oder Eingabe auf einem Baustein meldet ihn über `onWaehle`.
 */
export function ArchitekturDiagramm({
  gewaehlt,
  onWaehle,
  durchlauf,
  dunkel,
}: {
  gewaehlt: string | null;
  onWaehle: (id: string | null) => void;
  durchlauf: { aktiv: string | null; erledigt: string[] };
  dunkel: boolean;
}) {
  const { nodes, edges } = useMemo(() => knotenUndKanten("app", gewaehlt, durchlauf), [gewaehlt, durchlauf]);
  const behaelter = useRef<HTMLDivElement>(null);
  // Startansicht: volle Breite lesbar, oben beginnend; weiter nach unten per Mausrad oder Ziehen
  const startansicht = () => {
    const breite = behaelter.current?.clientWidth ?? BREITE;
    const zoom = Math.min(1, (breite - 48) / BREITE);
    return { x: (breite - BREITE * zoom) / 2, y: 20, zoom };
  };
  return (
    <div ref={behaelter} className="h-full w-full">
    <ReactFlow
      className="architektur-flow"
      nodes={nodes}
      edges={edges}
      nodeTypes={KNOTEN_TYPEN}
      colorMode={dunkel ? "dark" : "light"}
      connectionMode={ConnectionMode.Loose}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      edgesFocusable={false}
      onNodeClick={(_, n) => {
        if (n.type === "baustein") onWaehle(n.id);
      }}
      onPaneClick={() => onWaehle(null)}
      onSelectionChange={({ nodes: auswahl }) => {
        const n = auswahl.find((x) => x.type === "baustein");
        if (n) onWaehle(n.id);
      }}
      onInit={(instanz) => void instanz.setViewport(startansicht())}
      panOnScroll
      zoomOnScroll={false}
      minZoom={0.2}
      maxZoom={2}
      ariaLabelConfig={DEUTSCH}
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--punkt)" />
      <Controls
        position="bottom-left"
        showInteractive={false}
        fitViewOptions={{ padding: 0.04 }}
      />
    </ReactFlow>
    </div>
  );
}

/** Abbildung für die Arbeit: schwarz-weiß, ohne Symbole, feste Größe, keine Bedienung. */
export function ArchitekturAbbildung() {
  const { nodes, edges } = useMemo(() => knotenUndKanten("abbildung", null, { aktiv: null, erledigt: [] }), []);
  return (
    <ReactFlow
      className="architektur-abbildung"
      nodes={nodes}
      edges={edges}
      nodeTypes={KNOTEN_TYPEN}
      colorMode="light"
      connectionMode={ConnectionMode.Loose}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      preventScrolling={false}
      defaultViewport={{ x: 1, y: 1, zoom: 1 }}
      proOptions={{ hideAttribution: true }}
      ariaLabelConfig={DEUTSCH}
    />
  );
}
