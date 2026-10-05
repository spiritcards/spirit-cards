#!/usr/bin/env node
/**
 * build-catalog.mjs — regenerate `lib/poc-art.catalog.json` from the vendored
 * v7 art tree under `public/poc-art/{universal,attack}/`.
 *
 * The v7 pack ships, per species, a compact `traits.json` (zOrder, fixed groups
 * + values, variable groups incl. `none` placeholders) written by
 * `scripts/vendor_v7.py`. This script stitches those into one datadriven catalog:
 *
 *   - zOrder / fixedGroups / variableGroups are DERIVED from the species files
 *     (v7 merged `15_frame+16_element+20_serial` → `15_card_frame` and
 *      `17_health+18_damage+19_defense` → `17_stats`).
 *   - per-species `fixed` map resolves fixed groups (dragons: 08_base_art=clean-base).
 *   - per-species `groups` hold the seed-picked categories incl. `none`.
 *   - `boxes` (data-overlay coordinates) are PRESERVED — the pack guarantees the
 *     card layout is unchanged, so name/HP/ATK/DEF/serial still land correctly.
 *
 * Sources / provenance:
 *   - layers: `poc-friends-review-v7.zip` (512 PNG layers, 16 species).
 *   - display names: CREATURE_NAMES.json v2 (universals) + attack manifest names.
 *
 * Run after vendoring:  node scripts/build-catalog.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ART = join(ROOT, "public", "poc-art");
const CATALOG_PATH = join(ROOT, "lib", "poc-art.catalog.json");
const PUBLIC_CATALOG_PATH = join(ART, "catalog.json");

const ELEMENT_RU = {
  fire: "Огонь",
  water: "Вода",
  earth: "Земля",
  air: "Воздух",
  lightning: "Молния",
  ice: "Лёд",
  metal: "Металл",
  spirit: "Дух",
};

// Species registry (names/elements/roles). Trait data comes from traits.json.
const SPECIES = [
  // --- universal creatures (v3/v7 names) ---
  { id: "fire_uglepuz", role: "universal", name: "Emberback", nameRu: "Углепуз", element: "fire" },
  { id: "water_kapleglot", role: "universal", name: "Ripplefin", nameRu: "Каплеглот", element: "water" },
  { id: "earth_plastun", role: "universal", name: "Mossroot", nameRu: "Пластун", element: "earth" },
  { id: "air_vihrolap", role: "universal", name: "Cloudwhisk", nameRu: "Вихролап", element: "air" },
  { id: "lightning_razryadnik", role: "universal", name: "Flashbound", nameRu: "Разрядник", element: "lightning" },
  { id: "ice_inezhor", role: "universal", name: "Frostpuff", nameRu: "Инежор", element: "ice" },
  { id: "metal_ferron", role: "universal", name: "Quicksilver", nameRu: "Феррон", element: "metal" },
  { id: "spirit_sumraks", role: "universal", name: "Moonglimmer", nameRu: "Сумракс", element: "spirit" },
  // --- attack dragons (v7: fully modular) ---
  { id: "fire_dragon", role: "attack", name: "Cindermaw", nameRu: null, element: "fire" },
  { id: "water_dragon", role: "attack", name: "Tidecoil", nameRu: null, element: "water" },
  { id: "earth_dragon", role: "attack", name: "Rootwaker", nameRu: null, element: "earth" },
  { id: "air_dragon", role: "attack", name: "Zephyrcrest", nameRu: null, element: "air" },
  { id: "lightning_dragon", role: "attack", name: "Voltrush", nameRu: null, element: "lightning" },
  { id: "ice_dragon", role: "attack", name: "Frostmane", nameRu: null, element: "ice" },
  { id: "metal_dragon", role: "attack", name: "Silvervein", nameRu: null, element: "metal" },
  { id: "spirit_dragon", role: "attack", name: "Starwisp", nameRu: null, element: "spirit" },
];

const groupNum = (g) => Number(String(g).split("_")[0]) || 0;
const byGroup = (a, b) => groupNum(a) - groupNum(b) || String(a).localeCompare(String(b));

function main() {
  const base = existsSync(CATALOG_PATH) ? JSON.parse(readFileSync(CATALOG_PATH, "utf8")) : {};

  const species = [];
  const fixedGroups = new Set();
  const variableGroups = new Set();
  let zOrder = null;

  for (const meta of SPECIES) {
    const dir = join(ART, meta.role, meta.id);
    const tpath = join(dir, "traits.json");
    if (!existsSync(tpath)) {
      console.warn(`! missing traits.json for ${meta.id}: ${tpath}`);
      continue;
    }
    const t = JSON.parse(readFileSync(tpath, "utf8"));
    zOrder = zOrder ?? t.zOrder;
    for (const g of t.fixedGroups) fixedGroups.add(g);

    const groups = {};
    for (const g of Object.keys(t.groups).sort(byGroup)) {
      if (t.fixedGroups.includes(g)) continue;
      variableGroups.add(g);
      groups[g] = t.groups[g].map((o) => ({
        value: o.value,
        nameEn: o.nameEn ?? o.value,
        nameRu: null,
        empty: !!o.empty,
      }));
    }

    species.push({
      id: meta.id,
      name: meta.name,
      nameRu: meta.nameRu,
      element: meta.element,
      elementRu: ELEMENT_RU[meta.element] ?? null,
      role: meta.role,
      path: `${meta.role}/${meta.id}`,
      fixed: t.fixed,
      groups,
    });
  }

  const catalog = {
    canvas: base.canvas ?? [512, 716],
    zOrder: zOrder ?? base.zOrder,
    fixedGroups: [...fixedGroups].sort(byGroup),
    variableGroups: [...variableGroups].sort(byGroup),
    boxes: base.boxes, // data-overlay coordinates (layout preserved by v7)
    species,
  };

  const json = JSON.stringify(catalog, null, 2) + "\n";
  writeFileSync(CATALOG_PATH, json);
  writeFileSync(PUBLIC_CATALOG_PATH, json);
  console.log(
    `catalog: ${species.length} species (${species.filter((s) => s.role === "universal").length} universal, ` +
      `${species.filter((s) => s.role === "attack").length} attack) -> ${CATALOG_PATH}`,
  );
}

main();
