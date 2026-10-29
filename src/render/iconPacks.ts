import mermaid from "mermaid";

/**
 * Icons from any Iconify set (https://icon-sets.iconify.design/), used as `prefix:name` in
 * Architecture diagrams (`service db(mdi:database)[DB]`) and flowchart icon shapes
 * (`A@{ icon: "fa6-solid:user" }`). Only the icons a diagram uses are fetched from the
 * Iconify API, then registered with Mermaid. `logos` is bundled so it also works offline.
 */

interface IconifyJSON {
  prefix: string;
  icons: Record<string, unknown>;
  aliases?: Record<string, unknown>;
  width?: number;
  height?: number;
  not_found?: string[];
}

const BUNDLED_PREFIXES = new Set(["logos"]);
// Iconify's public API and its official mirrors, tried in order.
const API_HOSTS = ["https://api.iconify.design", "https://api.simplesvg.com", "https://api.unisvg.com"];
const FETCH_TIMEOUT_MS = 8000;

const NAME = "[a-z0-9]+(?:-[a-z0-9]+)*";
const ICON_REFS = [
  // Architecture: service id(prefix:name)[Label], group id(prefix:name)[Label]
  new RegExp(`\\(\\s*(${NAME}):(${NAME})\\s*\\)`, "g"),
  // Flowchart icon shape: id@{ icon: "prefix:name" }
  new RegExp(`\\bicon\\s*:\\s*["'](${NAME}):(${NAME})["']`, "g"),
];

/** Icons fetched so far, per prefix. */
const loaded = new Map<string, IconifyJSON>();
/** "prefix:name" pairs the API reported as missing, so they aren't requested again. */
const missing = new Set<string>();

/** Returns the Iconify icons the source refers to, grouped by prefix. */
export function findIconRefs(source: string): Map<string, Set<string>> {
  const refs = new Map<string, Set<string>>();
  for (const pattern of ICON_REFS) {
    for (const [, prefix, name] of source.matchAll(pattern)) {
      if (BUNDLED_PREFIXES.has(prefix)) continue;
      if (!refs.has(prefix)) refs.set(prefix, new Set());
      refs.get(prefix)!.add(name);
    }
  }
  return refs;
}

async function fetchIcons(prefix: string, names: string[]): Promise<IconifyJSON | null> {
  const query = `${encodeURIComponent(prefix)}.json?icons=${names.map(encodeURIComponent).join(",")}`;
  for (const host of API_HOSTS) {
    try {
      const response = await fetch(`${host}/${query}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (response.status === 404) return null; // No such icon set.
      if (!response.ok) continue;
      return (await response.json()) as IconifyJSON;
    } catch {
      // Network error or timeout: try the next host.
    }
  }
  throw new Error("Iconify API unreachable");
}

/**
 * Fetches and registers the Iconify icons used by the source. Network problems are ignored:
 * Mermaid then draws its "?" placeholder, and the icons are retried on the next render.
 */
export async function loadIconsFor(source: string): Promise<void> {
  const refs = findIconRefs(source);
  await Promise.all(
    [...refs].map(async ([prefix, names]) => {
      const have = loaded.get(prefix);
      const wanted = [...names].filter(
        (n) => !missing.has(`${prefix}:${n}`) && !have?.icons[n] && !have?.aliases?.[n]
      );
      if (!wanted.length) return;

      let data: IconifyJSON | null;
      try {
        data = await fetchIcons(prefix, wanted);
      } catch {
        return;
      }
      if (!data) {
        wanted.forEach((n) => missing.add(`${prefix}:${n}`));
        return;
      }
      data.not_found?.forEach((n) => missing.add(`${prefix}:${n}`));

      const merged: IconifyJSON = {
        ...(have ?? {}),
        ...data,
        prefix,
        icons: { ...have?.icons, ...data.icons },
        aliases: { ...have?.aliases, ...data.aliases },
      };
      delete merged.not_found;
      loaded.set(prefix, merged);
      // Registering with "icons" replaces Mermaid's cached copy of the set.
      mermaid.registerIconPacks([{ name: prefix, icons: merged as never }]);
    })
  );
}
