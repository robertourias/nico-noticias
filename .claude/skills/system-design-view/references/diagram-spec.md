# Diagram spec (input for `scripts/build_excalidraw.py`)

```json
{
  "title": "Checkout — AWS (Option B)",
  "subtitle": "1M DAU · peak 2.4k req/s · 99.9% · RPO 5 min",
  "nodes": [
    {"id": "alb", "label": "ALB", "sub": "L7, 2 AZs", "icon": "ElasticLoadBalancing",
     "col": 1, "row": 1, "spof": false, "tag": "2.4k req/s peak", "legend": "Application Load Balancer"}
  ],
  "groups": [
    {"id": "vpc", "label": "VPC 10.0.0.0/16", "kind": "vpc", "members": ["pub", "priv"]},
    {"id": "pub", "label": "Public subnets", "kind": "public", "members": ["alb"]}
  ],
  "edges": [
    {"from": "alb", "to": "svc", "label": "HTTP", "kind": "sync", "both": false}
  ],
  "legend_extra": ["Numbers under boxes = peak estimates"],
  "notes": [{"title": "Estimates", "lines": ["Peak QPS: 2,400", "DB growth: 180 GB/yr"]}]
}
```

## Fields

| Field | Notes |
|---|---|
| `nodes[].col/row` | Grid cell (320 x 260 px; boxes are 170 x 150). Integers or halves, one node per cell. Flow reads left to right: clients, edge/LB, compute, data stores. |
| `nodes[].icon` | File stem in the icons dir (`<icon>.svg`). Missing: grey initials badge plus a warning. |
| `nodes[].sub` | At most 2 short lines: replicas, instance/task size, engine mode, persistence mode. |
| `nodes[].tag` | Blue capacity/estimate text under the box, at most 22 characters. |
| `nodes[].spof` | Red dashed border, "SPOF" badge and a legend entry. |
| `nodes[].legend` | Legend text for this node's icon (defaults to `label`). |
| `groups[].kind` | `region`, `vpc`, `az`, `public`, `private`, `host`, `network`, `generic`. The box is the members' bounding box plus 34 px padding, so members must be contiguous in the grid. Nesting is allowed. |
| `groups[].members` | Node ids and/or group ids. |
| `edges[].kind` | `sync` solid black, `async` dashed blue, `replication` dotted green, `control` dashed purple (IaC, CI/CD). Arrows bind to their boxes. |
| `edges[].label` | At most 12 characters (protocol, port, verb: `HTTPS`, `gRPC`, `INCR`, `SQS`, `OIDC`). |
| `legend_extra` | Extra legend lines. The legend itself is one box on the right, generated with every icon, edge kind, group kind and SPOF in use. |

## Visual defaults

Helvetica (`fontFamily` 2), roughness 0. Title 32, labels 18, helper text 14, never below 14. Aim for about 20 nodes; beyond that, an overview plus detail diagrams.

## Lint (fix the spec, never ignore)

- ERROR: two nodes in one cell.
- ERROR: a non-member node inside a group's box. Move it outside that group's column/row span.
- ERROR: an edge passes through another node. Reorder rows/cols or route through an empty row.
- ERROR: overlapping sibling groups. Leave an empty row or column between them.
- WARN: text overflow, label wider than its arrow, missing icon, font below 14 px.

Tips: multi-AZ means two `az` groups stacked in rows (for example rows 0–1 and 3–4) with an empty row between. Put async consumers one row below their producer.

If you must edit an `.excalidraw` by hand, keep the builder's rules: at least 150 px horizontal and 100 px vertical between boxes, arrows bound to boxes, one legend box on the right.
