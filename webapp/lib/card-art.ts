import sharp, { type OverlayOptions } from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { keccak256, stringToHex, type Hex } from "viem";
import { deriveCard, statsFromSeed, type ArtCatalog, type Box, type CardStats } from "./seed-traits";
import catalog from "./poc-art.catalog.json";
import { textSvg, GLYPH_H } from "./pixel-font";

/**
 * card-art.ts — deterministic layered-card compositor for Spirit Cards.
 *
 * Composes the artist's PNG trait layers (public/poc-art/<species.path>/) in the
 * fixed z-order, then overlays dynamic DATA (HP/ATK/DEF, serial, name, rarity)
 * that the artist intentionally left blank. Same seed → same card.
 *
 * Two creature lines share one renderer: universal beasts
 * (public/poc-art/universal/…) and attack dragons (public/poc-art/attack/…).
 * The layer set is data (catalog.json); the selection is derived from the
 * on-chain seed (seed-traits.ts); stats come from `Battle.statsOf` on-chain.
 */

const ART_ROOT = path.join(process.cwd(), "public", "poc-art");
const cat = catalog as unknown as ArtCatalog;
const CANVAS = cat.canvas;
const CW = CANVAS[0];
const CH = CANVAS[1];
const BOXES = cat.boxes as Record<string, Box>;

const layerCache = new Map<string, Buffer>();

async function loadLayer(speciesPath: string, group: string, value: string): Promise<Buffer | null> {
  const p = path.join(ART_ROOT, speciesPath, group, `${value}.png`);
  const hit = layerCache.get(p);
  if (hit) return hit;
  try {
    const buf = await readFile(p);
    layerCache.set(p, buf);
    return buf;
  } catch {
    // `none` (and any missing) layers simply don't exist — skip, don't crash.
    return null;
  }
}

export type RenderOpts = {
  seed: Hex;
  tokenId: bigint;
  /** battle stats; if omitted, derived from the seed (chain parity). */
  stats?: CardStats;
  maxSupply?: bigint;
  /** output scale (2 = 1024x1432 retina). Default 2. */
  scale?: number;
  /** force a specific species (used by the /api/preview endpoint). */
  speciesId?: string;
};

function statText(box: Box, value: number, scale: number): string {
  const [, y0, x1, y1] = box;
  const cy = Math.round((y0 + y1) / 2) - Math.floor((GLYPH_H * scale) / 2);
  return textSvg(String(value), { x: x1 - 12, y: cy, scale, align: "right", color: "#eef2ff" });
}

/** Composite a full card PNG for a token. */
export async function renderCardPng(opts: RenderOpts): Promise<Buffer> {
  const card = deriveCard(opts.seed, opts.tokenId, opts.speciesId);
  const stats = opts.stats ?? statsFromSeed(opts.seed);
  const scale = opts.scale ?? 2;

  const fixedGroups: string[] = cat.fixedGroups;
  const composites: OverlayOptions[] = [];
  for (const group of cat.zOrder) {
    let value: string | undefined;
    if (fixedGroups.includes(group)) value = card.species.fixed[group] ?? "default";
    else value = card.picks.find((p) => p.group === group)?.value;
    if (!value || value === "none") continue; // `none` = skip the layer
    const layer = await loadLayer(card.species.path, group, value);
    if (layer) composites.push({ input: layer, top: 0, left: 0 });
  }

  const base = sharp({
    create: { width: CW, height: CH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  });

  // --- data overlay (artist left these blank by design) ---
  const s = scale;
  const nameBox = BOXES.name;
  const nameText = card.species.name.toUpperCase();
  const overlay =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}">` +
    textSvg(nameText, {
      x: nameBox[0] + 88,
      y: Math.round((nameBox[1] + nameBox[3]) / 2) - Math.floor((GLYPH_H * s) / 2),
      scale: s,
      color: "#f4f7ff",
    }) +
    textSvg(card.rarityTier, {
      x: nameBox[2] - 14,
      y: Math.round((nameBox[1] + nameBox[3]) / 2) - Math.floor((GLYPH_H * s) / 2),
      scale: s,
      align: "right",
      color: "#ffd76a",
    }) +
    statText(BOXES.health, stats.hp, s) +
    statText(BOXES.damage, stats.atk, s) +
    statText(BOXES.defense, stats.def, s) +
    textSvg(`#${opts.tokenId.toString()}${opts.maxSupply ? ` / ${opts.maxSupply.toString()}` : ""}`, {
      x: Math.round((BOXES.serial[0] + BOXES.serial[2]) / 2),
      y: Math.round((BOXES.serial[1] + BOXES.serial[3]) / 2) - Math.floor((GLYPH_H * s) / 2),
      scale: s,
      align: "center",
      color: "#dbe3f4",
    }) +
    `</svg>`;

  // Single composite pass: layer PNGs + the data overlay (sharp's .composite()
  // REPLACES rather than appends, so everything must go in one call).
  composites.push({ input: Buffer.from(overlay), top: 0, left: 0 });

  const merged = await base.composite(composites).png().toBuffer();

  if (s > 1) {
    return sharp(merged)
      .resize(CW * s, CH * s, { kernel: "nearest" })
      .png()
      .toBuffer();
  }
  return merged;
}

/**
 * Deterministic preview of one specific creature (trait picks fixed by a
 * species-derived seed). Used by the collection "overview of all" grid so every
 * design is visible regardless of how many tokens are minted.
 */
export async function renderSpeciesCard(
  speciesId: string,
  opts: { scale?: number; maxSupply?: bigint } = {},
): Promise<Buffer> {
  const seed = keccak256(stringToHex(`poc-species-preview:${speciesId}`)) as Hex;
  return renderCardPng({
    seed,
    tokenId: 1n,
    speciesId,
    maxSupply: opts.maxSupply,
    scale: opts.scale,
  });
}
