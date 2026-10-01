#!/usr/bin/env python3
"""Build a legible .excalidraw architecture diagram from a JSON spec.

Usage:
  build_excalidraw.py spec.json --icons icons/ --out diagram.excalidraw [--preview preview.svg]

Spec format: see references/diagram-spec.md.
Lint warnings are printed to stderr; exit code 1 if any ERROR was found.
"""
import argparse, base64, json, os, random, sys, time, html

# ---- layout constants (tuned for legibility at 100% zoom) -------------------
CELL_W, CELL_H = 320, 260          # grid pitch -> ~150px horizontal / ~110px vertical gaps
NODE_W, NODE_H = 170, 150
ICON = 56
GROUP_PAD, GROUP_LABEL_H = 34, 30
MARGIN, TITLE_H = 80, 120
FONT = 2                            # Helvetica: cleaner than the hand-drawn default
F_TITLE, F_SUB, F_LABEL, F_SMALL = 32, 18, 18, 14
MIN_FONT = 14

EDGE_STYLES = {  # kind: (stroke, strokeStyle, legend text)
    "sync":        ("#1e1e1e", "solid",  "Synchronous request"),
    "async":       ("#1971c2", "dashed", "Async / queue / event"),
    "replication": ("#2f9e44", "dotted", "Replication / backup"),
    "control":     ("#9c36b5", "dashed", "Provisioning / deploy (IaC, CI/CD)"),
}
GROUP_STYLES = {  # kind: (stroke, background, strokeStyle, legend text)
    "region":  ("#495057", "#f8f9fa", "solid",  "Region / provider"),
    "vpc":     ("#1971c2", "#e7f5ff", "solid",  "VPC / private network"),
    "az":      ("#868e96", "#f8f9fa", "dashed", "Availability zone"),
    "public":  ("#2f9e44", "#ebfbee", "solid",  "Public subnet / edge"),
    "private": ("#e8590c", "#fff4e6", "solid",  "Private subnet / internal"),
    "host":    ("#6741d9", "#f3f0ff", "solid",  "Host / VPS / cluster"),
    "network": ("#0c8599", "#e3fafc", "dashed", "Container network"),
    "generic": ("#868e96", "#ffffff", "dashed", "Logical group"),
}
SPOF_COLOR = "#e03131"

warnings, errors = [], []
now = int(time.time() * 1000)
_seq = 0


def uid(prefix):
    global _seq
    _seq += 1
    return f"{prefix}-{_seq}"


def base(t, x, y, w, h, **kw):
    e = dict(type=t, id=kw.pop("id", uid(t)), x=x, y=y, width=w, height=h, angle=0,
             strokeColor="#1e1e1e", backgroundColor="transparent", fillStyle="solid",
             strokeWidth=2, strokeStyle="solid", roughness=0, opacity=100, groupIds=[],
             frameId=None, roundness=None, seed=random.randint(1, 2**31), version=1,
             versionNonce=random.randint(1, 2**31), isDeleted=False, boundElements=[],
             updated=now, link=None, locked=False)
    e.update(kw)
    return e


def text_w(s, size):
    return max(len(line) for line in s.split("\n")) * size * 0.56


def wrap(s, size, width):
    out = []
    for para in s.split("\n"):
        line = ""
        for word in para.split():
            cand = f"{line} {word}".strip()
            if text_w(cand, size) > width and line:
                out.append(line)
                line = word
            else:
                line = cand
        out.append(line)
    return "\n".join(out)


def text(x, y, s, size, color="#1e1e1e", align="left", container=None, **kw):
    if size < MIN_FONT:
        warnings.append(f"font {size}px below minimum {MIN_FONT}px: {s[:30]!r}")
    lines = s.count("\n") + 1
    w, h = text_w(s, size), lines * size * 1.25
    if align == "center" and container is None:
        x -= w / 2
    return base("text", x, y, w, h, text=s, originalText=s, fontSize=size, fontFamily=FONT,
                textAlign=align, verticalAlign="top" if container is None else "middle",
                containerId=container, lineHeight=1.25, autoResize=True, strokeColor=color, **kw)


def svg_dataurl(path):
    return "data:image/svg+xml;base64," + base64.b64encode(open(path, "rb").read()).decode()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("spec")
    ap.add_argument("--icons", default="icons")
    ap.add_argument("--out", required=True)
    ap.add_argument("--preview")
    a = ap.parse_args()
    spec = json.load(open(a.spec, encoding="utf-8"))

    els, files = [], {}
    nodes = {n["id"]: n for n in spec.get("nodes", [])}
    icon_legend = {}  # icon -> legend label

    # ---- title --------------------------------------------------------------
    title_els = [text(MARGIN, MARGIN - 40, spec.get("title", "Architecture"), F_TITLE)]
    if spec.get("subtitle"):
        title_els.append(text(MARGIN, MARGIN + 5, spec["subtitle"], F_SUB, "#495057"))

    # ---- node geometry ------------------------------------------------------
    x0, y0 = MARGIN, MARGIN + TITLE_H
    cells = {}
    for n in nodes.values():
        n["x"] = x0 + n["col"] * CELL_W + (CELL_W - NODE_W) / 2
        n["y"] = y0 + n["row"] * CELL_H + (CELL_H - NODE_H) / 2
        n["bbox"] = (n["x"], n["y"], n["x"] + NODE_W, n["y"] + NODE_H)
        key = (n["col"], n["row"])
        if key in cells:
            errors.append(f"nodes {cells[key]} and {n['id']} share cell {key}")
        cells[key] = n["id"]

    # ---- groups (resolve nested bboxes innermost-first) ---------------------
    groups = {g["id"]: g for g in spec.get("groups", [])}
    parent = {}
    for g in groups.values():
        for m in g["members"]:
            if m not in nodes and m not in groups:
                errors.append(f"group {g['id']}: unknown member {m}")
            parent.setdefault(m, g["id"])

    def depth(gid):
        d = 0
        while gid in parent:
            gid, d = parent[gid], d + 1
        return d

    def bbox_of(gid, seen=()):
        g = groups[gid]
        if "bbox" in g:
            return g["bbox"]
        boxes = [nodes[m]["bbox"] if m in nodes else bbox_of(m, seen + (gid,))
                 for m in g["members"] if m in nodes or m in groups]
        if not boxes:
            errors.append(f"group {gid} is empty")
            boxes = [(0, 0, 10, 10)]
        x1 = min(b[0] for b in boxes) - GROUP_PAD
        y1 = min(b[1] for b in boxes) - GROUP_PAD - GROUP_LABEL_H
        x2 = max(b[2] for b in boxes) + GROUP_PAD
        y2 = max(b[3] for b in boxes) + GROUP_PAD
        g["bbox"] = (x1, y1, x2, y2)
        return g["bbox"]

    group_els = []
    for gid in sorted(groups, key=depth):  # outer groups drawn first (behind)
        g = groups[gid]
        x1, y1, x2, y2 = bbox_of(gid)
        stroke, bg, style, _ = GROUP_STYLES.get(g.get("kind", "generic"), GROUP_STYLES["generic"])
        group_els.append(base("rectangle", x1, y1, x2 - x1, y2 - y1, strokeColor=stroke,
                              backgroundColor=bg, strokeStyle=style, strokeWidth=2,
                              roundness={"type": 3}, id=f"grp-{gid}"))
        group_els.append(text(x1 + 12, y1 + 8, g["label"], F_SMALL + 2, stroke))

    # overlapping non-nested groups hurt legibility
    def ancestors(x):
        out = set()
        while x in parent:
            x = parent[x]
            out.add(x)
        return out

    gl = list(groups)
    for i, g1 in enumerate(gl):
        for g2 in gl[i + 1:]:
            if g1 in ancestors(g2) or g2 in ancestors(g1):
                continue
            b1, b2 = groups[g1]["bbox"], groups[g2]["bbox"]
            if b1[0] < b2[2] and b2[0] < b1[2] and b1[1] < b2[3] and b2[1] < b1[3]:
                errors.append(f"groups {g1} and {g2} overlap: leave an empty row/col between them")

    def members_deep(gid):
        out = set()
        for m in groups[gid]["members"]:
            out |= members_deep(m) if m in groups else {m}
        return out

    for gid, g in groups.items():
        x1, y1, x2, y2 = g["bbox"]
        inside = members_deep(gid)
        for n in nodes.values():
            b = n["bbox"]
            if n["id"] not in inside and b[0] < x2 and x1 < b[2] and b[1] < y2 and y1 < b[3]:
                errors.append(f"node {n['id']} is not in group {gid} but sits inside its box: "
                              f"move it to a column/row outside the group")

    # ---- nodes --------------------------------------------------------------
    node_els = []
    spof_any = False
    for n in nodes.values():
        gid = f"node-{n['id']}"
        spof = n.get("spof", False)
        spof_any |= spof
        rect = base("rectangle", n["x"], n["y"], NODE_W, NODE_H, id=f"n-{n['id']}",
                    backgroundColor="#ffffff", roundness={"type": 3}, groupIds=[gid],
                    strokeColor=SPOF_COLOR if spof else "#343a40",
                    strokeStyle="dashed" if spof else "solid", strokeWidth=3 if spof else 2)
        node_els.append(rect)
        icon = n.get("icon")
        ipath = os.path.join(a.icons, f"{icon}.svg") if icon else None
        ix, iy = n["x"] + (NODE_W - ICON) / 2, n["y"] + 14
        if ipath and os.path.exists(ipath):
            fid = f"file-{icon}"
            files.setdefault(fid, dict(mimeType="image/svg+xml", id=fid, dataURL=svg_dataurl(ipath),
                                       created=now))
            node_els.append(base("image", ix, iy, ICON, ICON, fileId=fid, status="saved",
                                 scale=[1, 1], crop=None, groupIds=[gid], strokeColor="transparent"))
            icon_legend.setdefault(icon, n.get("legend", n["label"].split("\n")[0]))
        else:
            if icon:
                warnings.append(f"icon '{icon}' not found for node {n['id']}: using text badge")
            badge = base("rectangle", ix, iy, ICON, ICON, backgroundColor="#e9ecef",
                         roundness={"type": 3}, groupIds=[gid], strokeColor="#adb5bd")
            node_els.append(badge)
            initials = "".join(w[0] for w in n["label"].split()[:2]).upper()
            node_els.append(text(ix + ICON / 2, iy + ICON / 2 - 11, initials, F_LABEL, "#495057",
                                 align="center", groupIds=[gid]))
        label = wrap(n["label"], F_LABEL, NODE_W - 16)
        ty = iy + ICON + 8
        node_els.append(text(n["x"] + NODE_W / 2, ty, label, F_LABEL, align="center", groupIds=[gid]))
        ty += (label.count("\n") + 1) * F_LABEL * 1.25
        if n.get("sub"):
            sub = wrap(n["sub"], F_SMALL, NODE_W - 16)
            node_els.append(text(n["x"] + NODE_W / 2, ty + 2, sub, F_SMALL, "#495057",
                                 align="center", groupIds=[gid]))
            ty += (sub.count("\n") + 1) * F_SMALL * 1.25
        if ty > n["y"] + NODE_H - 6:
            warnings.append(f"node {n['id']}: text overflows box, shorten label/sub")
        if spof:
            node_els.append(text(n["x"] + NODE_W - 50, n["y"] - 22, "⚠ SPOF", F_SMALL, SPOF_COLOR,
                                 groupIds=[gid]))
        if n.get("tag"):  # capacity/estimate tag under the box
            node_els.append(text(n["x"] + NODE_W / 2, n["y"] + NODE_H + 6, n["tag"], F_SMALL,
                                 "#1971c2", align="center", groupIds=[gid]))

    # ---- edges --------------------------------------------------------------
    edge_els, kinds_used = [], set()
    rect_by_id = {e["id"]: e for e in node_els if e["type"] == "rectangle" and e["id"].startswith("n-")}
    for ed in spec.get("edges", []):
        if ed["from"] not in nodes or ed["to"] not in nodes:
            errors.append(f"edge {ed['from']}->{ed['to']}: unknown node")
            continue
        s, t = nodes[ed["from"]], nodes[ed["to"]]
        kind = ed.get("kind", "sync")
        kinds_used.add(kind)
        stroke, style, _ = EDGE_STYLES.get(kind, EDGE_STYLES["sync"])
        scx, scy = s["x"] + NODE_W / 2, s["y"] + NODE_H / 2
        tcx, tcy = t["x"] + NODE_W / 2, t["y"] + NODE_H / 2
        gap = 8
        if abs(tcx - scx) >= abs(tcy - scy):
            d = 1 if tcx > scx else -1
            p1 = (scx + d * (NODE_W / 2 + gap), scy)
            p2 = (tcx - d * (NODE_W / 2 + gap), tcy)
        else:
            d = 1 if tcy > scy else -1
            p1 = (scx, scy + d * (NODE_H / 2 + gap))
            p2 = (tcx, tcy - d * (NODE_H / 2 + gap))
        arrow = base("arrow", p1[0], p1[1], abs(p2[0] - p1[0]), abs(p2[1] - p1[1]),
                     points=[[0, 0], [p2[0] - p1[0], p2[1] - p1[1]]], strokeColor=stroke,
                     strokeStyle=style, roundness={"type": 2}, lastCommittedPoint=None,
                     startBinding={"elementId": f"n-{s['id']}", "focus": 0, "gap": gap},
                     endBinding={"elementId": f"n-{t['id']}", "focus": 0, "gap": gap},
                     startArrowhead="arrow" if ed.get("both") else None, endArrowhead="arrow",
                     elbowed=False)
        rect_by_id[f"n-{s['id']}"]["boundElements"].append({"id": arrow["id"], "type": "arrow"})
        rect_by_id[f"n-{t['id']}"]["boundElements"].append({"id": arrow["id"], "type": "arrow"})
        edge_els.append(arrow)
        for o in nodes.values():  # edges must not cut through other nodes
            if o["id"] in (s["id"], t["id"]):
                continue
            bx1, by1, bx2, by2 = o["bbox"]
            if any(bx1 - 4 < p1[0] + (p2[0] - p1[0]) * k / 50 < bx2 + 4 and
                   by1 - 4 < p1[1] + (p2[1] - p1[1]) * k / 50 < by2 + 4 for k in range(51)):
                errors.append(f"edge {s['id']}->{t['id']} crosses node {o['id']}: "
                              f"swap positions or move one endpoint to another row")
        if ed.get("label"):
            mx, my = (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2
            lt = text(mx, my - F_SMALL * 0.6, ed["label"], F_SMALL, stroke, align="center",
                      container=arrow["id"])
            lt["x"] = mx - lt["width"] / 2
            arrow["boundElements"].append({"id": lt["id"], "type": "text"})
            edge_els.append(lt)
            seg = max(abs(p2[0] - p1[0]), abs(p2[1] - p1[1]))
            if lt["width"] > seg - 20 and abs(p2[0] - p1[0]) > abs(p2[1] - p1[1]):
                warnings.append(f"edge label {ed['label']!r} wider than its arrow: shorten it")

    # ---- legend + notes (right of the diagram) ------------------------------
    all_x2 = [e["x"] + e["width"] for e in group_els + node_els]
    all_y1 = [e["y"] for e in group_els + node_els] or [y0]
    lx, ly = max(all_x2 or [x0]) + 100, min(all_y1)
    leg, row_h, y = [], 44, ly + 56
    leg_w = 340
    for icon, label in icon_legend.items():
        fid = f"file-{icon}"
        leg.append(base("image", lx + 20, y, 32, 32, fileId=fid, status="saved", scale=[1, 1],
                        crop=None, strokeColor="transparent"))
        leg.append(text(lx + 64, y + 6, label, F_LABEL - 2))
        y += row_h
    for k in ("sync", "async", "replication", "control"):
        if k in kinds_used:
            stroke, style, desc = EDGE_STYLES[k]
            leg.append(base("arrow", lx + 20, y + 16, 34, 0, points=[[0, 0], [34, 0]],
                            strokeColor=stroke, strokeStyle=style, endArrowhead="arrow",
                            startArrowhead=None, startBinding=None, endBinding=None,
                            lastCommittedPoint=None, roundness=None))
            leg.append(text(lx + 64, y + 6, desc, F_LABEL - 2))
            y += row_h
    for kind in dict.fromkeys(g.get("kind", "generic") for g in groups.values()):
        stroke, bg, style, desc = GROUP_STYLES.get(kind, GROUP_STYLES["generic"])
        leg.append(base("rectangle", lx + 20, y + 4, 34, 26, strokeColor=stroke, backgroundColor=bg,
                        strokeStyle=style, roundness={"type": 3}))
        leg.append(text(lx + 64, y + 6, desc, F_LABEL - 2))
        y += row_h
    if spof_any:
        leg.append(base("rectangle", lx + 20, y + 4, 34, 26, strokeColor=SPOF_COLOR,
                        strokeStyle="dashed", strokeWidth=3, roundness={"type": 3}))
        leg.append(text(lx + 64, y + 6, "Single point of failure", F_LABEL - 2, SPOF_COLOR))
        y += row_h
    for extra in spec.get("legend_extra", []):
        leg.append(text(lx + 20, y + 6, "• " + extra, F_LABEL - 2))
        y += row_h
    leg_w = max([leg_w] + [e["x"] - lx + e["width"] + 20 for e in leg if e["type"] == "text"])
    legend_box = base("rectangle", lx, ly, leg_w, y - ly + 12, strokeColor="#343a40",
                      backgroundColor="#ffffff", roundness={"type": 3}, id="legend")
    leg = [legend_box, text(lx + 20, ly + 16, "Legend", F_LABEL + 2)] + leg

    ny = y + 40
    for note in spec.get("notes", []):
        body = "\n".join(note["lines"])
        t = text(lx + 20, ny + 50, body, F_SMALL + 1)
        box = base("rectangle", lx, ny, max(leg_w, t["width"] + 40), t["height"] + 70,
                   strokeColor="#1971c2", backgroundColor="#f8f9fa", roundness={"type": 3})
        leg += [box, text(lx + 20, ny + 16, note["title"], F_LABEL), t]
        ny += box["height"] + 30

    elements = title_els + group_els + edge_els + node_els + leg
    doc = {"type": "excalidraw", "version": 2, "source": "system-design-view",
           "elements": elements, "appState": {"viewBackgroundColor": "#ffffff", "gridSize": 20},
           "files": files}
    json.dump(doc, open(a.out, "w", encoding="utf-8"), indent=1)

    if a.preview:
        write_preview(elements, files, a.preview)

    for w in warnings:
        print("[warn]", w, file=sys.stderr)
    for e in errors:
        print("[ERROR]", e, file=sys.stderr)
    print(f"wrote {a.out}: {len(nodes)} nodes, {len(spec.get('edges', []))} edges, "
          f"{len(groups)} groups, {len(files)} icons")
    sys.exit(1 if errors else 0)


def write_preview(elements, files, path):
    """Plain SVG render for self-review (not a replacement for Excalidraw)."""
    xs = [e["x"] for e in elements] + [e["x"] + e["width"] for e in elements]
    ys = [e["y"] for e in elements] + [e["y"] + e["height"] for e in elements]
    ox, oy = min(xs) - 40, min(ys) - 40
    W, H = max(xs) - ox + 40, max(ys) - oy + 40
    dash = {"dashed": "10 6", "dotted": "3 5", "solid": "none"}
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}" '
           f'width="{W:.0f}" height="{H:.0f}" font-family="Helvetica, Arial, sans-serif">'
           '<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" '
           'markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" '
           'fill="context-stroke"/></marker></defs><rect width="100%" height="100%" fill="#fff"/>']
    by_id = {e["id"]: e for e in elements}
    for e in elements:
        x, y = e["x"] - ox, e["y"] - oy
        if e["type"] == "rectangle":
            out.append(f'<rect x="{x}" y="{y}" width="{e["width"]}" height="{e["height"]}" rx="12" '
                       f'fill="{e["backgroundColor"] if e["backgroundColor"] != "transparent" else "none"}" '
                       f'stroke="{e["strokeColor"]}" stroke-width="{e["strokeWidth"]}" '
                       f'stroke-dasharray="{dash[e["strokeStyle"]]}"/>')
        elif e["type"] == "arrow":
            (_, _), (dx, dy) = e["points"]
            out.append(f'<line x1="{x}" y1="{y}" x2="{x+dx}" y2="{y+dy}" stroke="{e["strokeColor"]}" '
                       f'stroke-width="2" stroke-dasharray="{dash[e["strokeStyle"]]}" marker-end="url(#ah)"/>')
        elif e["type"] == "image" and e["fileId"] in files:
            out.append(f'<image x="{x}" y="{y}" width="{e["width"]}" height="{e["height"]}" '
                       f'href="{files[e["fileId"]]["dataURL"]}"/>')
        elif e["type"] == "text":
            anchor = {"left": "start", "center": "middle"}[e["textAlign"]]
            tx = x + (e["width"] / 2 if anchor == "middle" else 0)
            if e.get("containerId") in by_id:
                out.append(f'<rect x="{x-4}" y="{y-2}" width="{e["width"]+8}" height="{e["height"]+4}" fill="#fff"/>')
            for i, line in enumerate(e["text"].split("\n")):
                out.append(f'<text x="{tx}" y="{y + e["fontSize"] * (1 + i * 1.25)}" font-size="{e["fontSize"]}" '
                           f'fill="{e["strokeColor"]}" text-anchor="{anchor}">{html.escape(line)}</text>')
    out.append("</svg>")
    open(path, "w", encoding="utf-8").write("\n".join(out))


if __name__ == "__main__":
    main()
