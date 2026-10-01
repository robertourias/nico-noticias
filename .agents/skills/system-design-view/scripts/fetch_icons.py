#!/usr/bin/env python3
"""Resolve technology icons to local SVG files for build_excalidraw.py.

Sources (downloaded once via `npm pack` into a cache dir):
  aws:   aws-icons            official AWS architecture icons (colored)
  logos: @iconify-json/logos  colored vendor logos (docker, postgresql, redis, terraform...)
  si:    simple-icons         monochrome brand icons, tinted with the brand hex

Usage:
  fetch_icons.py --out icons/ aws:AmazonRDS logos:postgresql si:traefikproxy
  fetch_icons.py --out icons/ postgresql redis           # auto: aws -> logos -> si
  fetch_icons.py --search elasticache                    # list candidate names

Each icon is written to <out>/<name>.svg where <name> is the part after the prefix.
Exit code 2 if any icon could not be resolved (the builder falls back to a text badge).
"""
import argparse, json, os, re, shutil, subprocess, sys, tarfile, glob

PKGS = {"aws": "aws-icons", "logos": "@iconify-json/logos", "si": "simple-icons"}
CACHE = os.path.expanduser(os.environ.get("EXCALIDRAW_ICON_CACHE", "~/.cache/excalidraw-icons"))


def pkg_dir(key):
    target = os.path.join(CACHE, key)
    if os.path.isdir(os.path.join(target, "package")):
        return os.path.join(target, "package")
    os.makedirs(target, exist_ok=True)
    try:
        out = subprocess.run([shutil.which("npm") or "npm", "pack", PKGS[key], "--silent"], cwd=target,
                             capture_output=True, text=True, check=True).stdout.strip().splitlines()[-1]
        with tarfile.open(os.path.join(target, out)) as t:
            t.extractall(target)
    except Exception as e:  # network or npm missing
        print(f"[warn] could not download {PKGS[key]}: {e}", file=sys.stderr)
        return None
    return os.path.join(target, "package")


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def aws_index():
    d = pkg_dir("aws")
    if not d:
        return {}
    idx = {}
    # architecture-service first so it wins over resource/category variants
    for sub in ["architecture-service", "architecture-group", "resource", "category"]:
        for f in glob.glob(os.path.join(d, "icons", sub, "*.svg")):
            idx.setdefault(norm(os.path.basename(f)[:-4]), f)
    return idx


def logos_data():
    d = pkg_dir("logos")
    return json.load(open(os.path.join(d, "icons.json"), encoding="utf-8")) if d else None


def si_data():
    d = pkg_dir("si")
    if not d:
        return None, {}
    meta = json.load(open(os.path.join(d, "data", "simple-icons.json"), encoding="utf-8"))
    meta = meta if isinstance(meta, list) else meta.get("icons", [])
    return d, {m["slug"]: m.get("hex", "000000") for m in meta if "slug" in m}


def from_aws(name, idx):
    n = norm(name)
    for cand in (n, "amazon" + n, "aws" + n):
        if cand in idx:
            return open(idx[cand], encoding="utf-8").read()
    return None


def from_logos(name, data):
    if not data:
        return None
    icons, aliases = data["icons"], data.get("aliases", {})
    key = name if name in icons else aliases.get(name, {}).get("parent")
    if not key and name + "-icon" in icons:
        key = name + "-icon"  # prefer the square mark over the wordmark
    if not key or key not in icons:
        return None
    ic = icons[key]
    w, h = ic.get("width", data.get("width", 256)), ic.get("height", data.get("height", 256))
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{ic.get("left",0)} {ic.get("top",0)} {w} {h}" width="{w}" height="{h}">{ic["body"]}</svg>'


def from_si(name, d, hexes):
    if not d:
        return None
    f = os.path.join(d, "icons", f"{name}.svg")
    if not os.path.exists(f):
        return None
    svg = open(f, encoding="utf-8").read()
    return svg.replace("<svg ", f'<svg fill="#{hexes.get(name, "000000")}" ', 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="*")
    ap.add_argument("--out", default="icons")
    ap.add_argument("--search")
    a = ap.parse_args()

    if a.search:
        q = norm(a.search)
        idx = aws_index()
        print("aws:  ", sorted({os.path.basename(v)[:-4] for k, v in idx.items() if q in k})[:15])
        ld = logos_data()
        if ld:
            print("logos:", [k for k in ld["icons"] if q in norm(k)][:15])
        d, hexes = si_data()
        print("si:   ", [k for k in hexes if q in k][:15])
        return

    os.makedirs(a.out, exist_ok=True)
    idx, ld, (sd, hexes) = None, None, (None, {})
    missing = []
    for raw in a.names:
        prefix, _, name = raw.partition(":") if ":" in raw else ("", "", raw)
        svg = None
        for src in ([prefix] if prefix else ["aws", "logos", "si"]):
            if src == "aws":
                idx = idx if idx is not None else aws_index()
                svg = from_aws(name, idx)
            elif src == "logos":
                ld = ld if ld is not None else logos_data()
                svg = from_logos(name, ld)
            elif src == "si":
                if sd is None:
                    sd, hexes = si_data()
                svg = from_si(name, sd, hexes)
            if svg:
                break
        if svg:
            open(os.path.join(a.out, f"{name}.svg"), "w", encoding="utf-8").write(svg)
            print(f"[ok] {raw} -> {a.out}/{name}.svg")
        else:
            missing.append(raw)
            print(f"[missing] {raw} (try --search)", file=sys.stderr)
    sys.exit(2 if missing else 0)


if __name__ == "__main__":
    main()
