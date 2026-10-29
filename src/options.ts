export type MermaidTheme = "default" | "neutral" | "dark" | "forest" | "base";

export interface DiagramOptions {
  theme: MermaidTheme;
  /** Resolution multiplier for the PNG fallback image. */
  scale: number;
  /** Maximum width of the inserted picture, in inches. */
  maxWidthIn: number;
  background: "white" | "transparent";
  /** Skip the SVG part and insert only the PNG. */
  pngOnly: boolean;
}

export const DEFAULT_OPTIONS: DiagramOptions = {
  theme: "default",
  scale: 2,
  maxWidthIn: 6.5,
  background: "white",
  pngOnly: false,
};
