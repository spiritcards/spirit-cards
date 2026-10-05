#!/usr/bin/env python3
"""Vendor the v7 art pack (poc-friends-review-v7.zip) into webapp/public/poc-art.

For every species it:
  1. extracts the PNG layers into the renderer's on-disk layout
        <role>/<id>/<group>/<value>.png
     (source layer: <role>/species/<id>/layers/<group>/<group>_<value>.png)
  2. writes a compact <role>/<id>/traits.json with the species' z-order,
     fixed groups/values and variable groups (including `none` placeholders).

The renderer (lib/card-art.ts) + catalog generator (scripts/build-catalog.mjs)
consume exactly this layout, so the vendored tree can never drift.

Usage:
    python3 scripts/vendor_v7.py [path-to-zip]
Default zip: the delivered Telegram download.
"""
import json
import os
import re
import shutil
import sys
import zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
ART = os.path.join(ROOT, "public", "poc-art")
DEFAULT_ZIP = "/home/ser/Downloads/Telegram Desktop/poc-friends-review-v7.zip"

# 08_base_art ships as a single-value group. v7 marks it "fixed" for universals
# only; we promote it to fixed for every species so the renderer can resolve it
# from a species' `fixed` map (dragons use the "clean-base" body).
EXTRA_FIXED = ["08_base_art"]


def main() -> None:
    zip_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_ZIP
    if not os.path.exists(zip_path):
        sys.exit(f"zip not found: {zip_path}")

    zf = zipfile.ZipFile(zip_path)
    names = zf.namelist()

    species_dirs: dict[str, list[str]] = {}
    for n in names:
        m = re.match(r"^(universal|attack)/species/([^/]+)/manifest\.json$", n)
        if m:
            species_dirs.setdefault(m.group(1), []).append(m.group(2))
    for role in species_dirs:
        species_dirs[role].sort()

    total_png = 0
    species_total = 0
    for role, ids in species_dirs.items():
        for sid in ids:
            base = f"{role}/species/{sid}"
            man = json.loads(zf.read(f"{base}/manifest.json"))
            anchors = json.loads(zf.read(f"{base}/ANCHORS.json"))
            traits = man.get("traits", [])

            z_order = anchors["zOrder"]
            fixed_groups = list(anchors.get("fixedGroups", []))
            for g in EXTRA_FIXED:
                if g not in fixed_groups and any(t.get("group") == g for t in traits):
                    fixed_groups.append(g)

            outdir = os.path.join(ART, role, sid)
            if os.path.exists(outdir):
                shutil.rmtree(outdir)
            os.makedirs(outdir, exist_ok=True)

            fixed: dict[str, str] = {}
            groups: dict[str, list] = {}
            for t in traits:
                g, v = t.get("group"), t.get("value")
                if g is None or v is None:
                    continue
                if g in fixed_groups:
                    fixed.setdefault(g, v)
                else:
                    groups.setdefault(g, []).append(
                        {
                            "value": v,
                            "nameEn": t.get("nameEn") or t.get("label") or v,
                            "empty": bool(t.get("empty")) or t.get("png") is None,
                        }
                    )

            for t in traits:
                png = t.get("png")
                if not png:
                    continue
                g, v = t["group"], t["value"]
                data = zf.read(f"{base}/{png}")
                gdir = os.path.join(outdir, g)
                os.makedirs(gdir, exist_ok=True)
                with open(os.path.join(gdir, f"{v}.png"), "wb") as fh:
                    fh.write(data)
                total_png += 1

            with open(os.path.join(outdir, "traits.json"), "w") as fh:
                json.dump(
                    {"zOrder": z_order, "fixedGroups": fixed_groups, "fixed": fixed, "groups": groups},
                    fh,
                    indent=2,
                    ensure_ascii=False,
                )
            species_total += 1

    print(f"vendored {total_png} PNG layers across {species_total} species -> {ART}")


if __name__ == "__main__":
    main()
