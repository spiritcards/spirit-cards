import { keccak256, stringToHex, type Hex } from "viem";
import catalog from "./poc-art.catalog.json";

/**
 * seed-traits.ts — deterministic on-chain seed → card composition.
 *
 * The contract stores ONLY `seedOf[id]` (bytes32). Everything visual is derived
 * off-chain from that seed here, deterministically and dependency-free (viem
 * keccak). The same seed always yields the same species + trait picks on the
 * client, the server and any future indexer — no server state, no randomness.
 *
 * NOTE: trait *probabilities* are intentionally NOT tuned yet (economics doc
 * `03_ECONOMY.md` still has open rarity numbers). Picks are uniform over the
 * available options per species; rarity is derived with the SAME formula the
 * on-chain `Battle.statsOf` uses, so card and battle always agree. [assumed]
 */

export type TraitOption = { value: string; nameEn: string; nameRu: string | null };
export type Box = [number, number, number, number];

/** One creature design — a universal beast or an attack dragon. */
export type Species = {
  id: string;
  name: string;
  nameRu: string | null;
  element: string;
  elementRu: string | null;
  /** "universal" | "attack" — the creature line. */
  role: string;
  /** Folder under public/poc-art, e.g. "universal/fire_uglepuz" / "attack/fire_dragon". */
  path: string;
  /** Fixed-group value overrides (dragons: 08_base_art = "clean-base"). */
  fixed: Record<string, string>;
  groups: Record<string, TraitOption[]>;
};

export type ArtCatalog = {
  canvas: [number, number];
  zOrder: string[];
  fixedGroups: string[];
  variableGroups: string[];
  boxes: Record<string, Box>;
  species: Species[];
};

export const RARITY_TIERS = ["N", "R", "SR", "UR", "SSR", "Prism"] as const;
export type RarityTier = (typeof RARITY_TIERS)[number];

export type TraitPick = {
  group: string;
  value: string;
  nameEn: string;
  nameRu: string | null;
};

export type CardStats = { hp: number; atk: number; def: number; rarity: number };

export type DerivedCard = {
  species: Species;
  picks: TraitPick[];
  rarity: number;
  rarityTier: RarityTier;
};

/** Top 32 bits of keccak256("<seed>:<salt>:<i>") — a deterministic PRF. */
function word(seed: Hex, salt: string, i: number): number {
  const h = keccak256(stringToHex(`${seed}:${salt}:${i}`));
  return Number(BigInt(h) >> 224n);
}

function pick<T>(arr: T[], n: number): T {
  return arr[n % arr.length];
}

/** Deterministic composition for a token seed (species + one value per group). */
export function deriveCard(seed: Hex, tokenId: bigint, speciesId?: string): DerivedCard {
  const cat = catalog as unknown as ArtCatalog;
  const species =
    (speciesId ? cat.species.find((s) => s.id === speciesId) : undefined) ??
    pick(cat.species, word(seed, `species:${tokenId}`, 0));

  let i = 1;
  const picks: TraitPick[] = [];
  for (const group of cat.variableGroups) {
    const opts = species.groups[group];
    if (!opts || opts.length === 0) continue;
    const v = pick(opts, word(seed, `${group}:${tokenId}`, i++));
    picks.push({ group, value: v.value, nameEn: v.nameEn, nameRu: v.nameRu });
  }

  // Rarity: parity with Battle.statsOf (top byte of seed, mod 6).
  const rarity = Number((BigInt(seed) >> 248n) % 6n);
  return { species, picks, rarity, rarityTier: RARITY_TIERS[rarity] };
}

/** The full creature registry (16 designs: 8 universal + 8 attack). */
export const speciesList: Species[] = (catalog as unknown as ArtCatalog).species;

/**
 * Deterministic battle stats from a seed — EXACT mirror of on-chain
 * `Battle.statsOf(card)`. Used to preview a card before/without a chain read.
 */
export function statsFromSeed(seed: Hex): CardStats {
  const s = BigInt(seed);
  const rarity = Number((s >> 248n) % 6n);
  const atk = 8 + Number((s >> 240n) & 0xffn) % 20 + rarity * 4;
  const def = 4 + Number((s >> 232n) & 0xffn) % 16 + rarity * 3;
  const hp = 50 + Number((s >> 224n) & 0xffn) % 100 + rarity * 15;
  return { hp, atk, def, rarity };
}

/** Human-readable trait rows for metadata / UI. */
export function traitAttributes(card: DerivedCard): { trait_type: string; value: string }[] {
  const cat = catalog as unknown as ArtCatalog;
  const rows: { trait_type: string; value: string }[] = [
    { trait_type: "Species", value: card.species.name },
    { trait_type: "Element", value: capitalize(card.species.element) },
    { trait_type: "Rarity", value: card.rarityTier },
  ];
  for (const p of card.picks) {
    if (p.value === "none") continue; // optional slot left empty
    rows.push({ trait_type: groupLabel(cat, p.group), value: p.nameEn });
  }
  return rows;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const GROUP_LABELS: Record<string, string> = {
  "02_material": "Background Texture",
  "03_effects": "Particles",
  "04_wings": "Wings",
  "05_tail": "Tail",
  "06_horns": "Horns",
  "07_crystals": "Crystals",
  "09_markings": "Markings",
  "10_runes": "Runes",
  "11_expression": "Expression",
  "12_eyes": "Eyes",
  "13_artifact": "Artifact",
  "14_coating": "Card Finish",
};

export function groupLabel(_cat: ArtCatalog, group: string): string {
  return GROUP_LABELS[group] ?? group;
}

export { catalog as artCatalog };
