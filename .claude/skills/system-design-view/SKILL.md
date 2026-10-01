---
name: system-design-view
description: Designs, sizes and draws infrastructure and system-design architectures as a legible .excalidraw diagram with real technology icons and a legend. Use this skill whenever the user asks to create, update, review or explain an infrastructure architecture or system design, even if Excalidraw or a diagram is never mentioned, e.g. "draw the architecture", "design a system for X", "how should I scale this", "update the infra diagram", "where are the SPOFs", "Postgres or Mongo", "ALB or NLB", "Hostinger VPS vs AWS", load balancing, ECS, IaC/Terraform, counters, SQL vs NoSQL, capacity estimates, authentication, SSO, OIDC, Keycloak. Also use it when an .excalidraw file or a diagram spec is attached.
metadata:
  title: System Design View
  category: design
  tags: [system-design, infrastructure, excalidraw, architecture, capacity-planning]
  agents: [claude-code]
  version: 1.0.0
  status: beta
  language: en
  visibility: public
  updated: 2026-09-25
---

# System Design View

Turn an infra or system-design request into three deliverables: sized estimates, a platform option the user confirmed, and a clean `.excalidraw` diagram with real icons and a legend. The user pays for decisions, not drawings, so nothing is drawn or changed until they confirm the option (or the diff, when updating).

## Modes

| Request | Mode | Draw? |
|---|---|---|
| "Design / draw / create the architecture for X", "how do I scale this" | **Create** | Yes, after steps 2 and 3 |
| "Add Redis to the diagram", "update the infra", `.excalidraw` or spec attached | **Update** | Yes, after the diff is confirmed |
| "Where are the SPOFs?", "Postgres or Mongo?", "ALB or NLB?", "Hostinger vs AWS" | **Inform** | No. Answer, then offer in one line: "Want this as a diagram?" |

## Workflow

### 1. Load context
- Update: read the existing `.excalidraw`. If a `*.spec.json` sits next to it, edit the spec, not the raw JSON. Without a spec, extract components, groups and arrows into a new one and summarize what exists.
- Reuse facts already given in the conversation. Asking again wastes the user's time.

### 2. Estimation interview (blocking)
Ask only what is missing, in **one batch of at most 6 questions**, each with a proposed default so the user can answer "defaults". Use a tappable-options tool when available.

| Input | Ask about |
|---|---|
| Users | DAU/MAU, peak factor, geography |
| Traffic | requests per user per day, read:write ratio, average payload |
| Data | record/object size, retention, yearly growth, hot vs cold |
| Reliability | availability SLO, RPO/RTO, downtime tolerance during deploys |
| Constraints | monthly cost ceiling, ops capacity, compliance/data residency |
| Special loads | counters/rate limits, uploads, realtime, jobs, search |
| Authentication | current IdP, logins at peak, SSO/social login, MFA, multi-tenant (realms), service-to-service calls |

Before proposing options, show a table with: average and peak QPS (read/write split), storage at year 1 and year 3, peak egress bandwidth, cache memory for the hot set, DB connections at peak, and compute units with about 30% headroom. Show the inputs beside every number so the user can challenge it. Every assumption goes into the diagram's "Estimates" note.

### 3. Confirm the platform option (blocking)
Offer 2 or 3 options from `references/option-catalogs.md`: **A** Hostinger VPS self-hosted, **B** AWS managed, **C** other or hybrid, only when it fits the constraints. For each: mapping per tier, remaining SPOFs, monthly cost range, ops effort, and where it stops scaling. Recommend one in a single sentence and wait for explicit confirmation.

In Update, present the diff instead (add / remove / change, each with the reason) and wait for confirmation.

### 4. Design review
The user's agent already knows these concepts; the skill's job is to make every decision visible in the drawing, through a node `sub`, a `tag`, an edge label or `legend_extra`.

| Topic | Must be visible |
|---|---|
| Load balancing | L4 vs L7, algorithm, health check, TLS termination point, sticky sessions. A single LB is a SPOF |
| SPOF | sweep DNS, LB/ingress, compute, DB, cache, queue, storage, NAT, the host itself, secrets, CI/CD. Mark each survivor with its mitigation or an explicit acceptance |
| IaC | tool, state and lock, managed vs manual. `control` edges to what it provisions |
| ECS | launch type, task size, min/max, autoscaling metric, service discovery, AZ spread |
| INCR counter | where the atomic counter lives, persistence, hot-key risk (sharding or batch-flush), idempotency on retry |
| Disk mode | ephemeral vs persistent volume, type/IOPS, Redis RDB/AOF, DB durability, backup and restore path |
| SQL vs NoSQL | justification by access pattern, replicas, partition/shard key, consistency expectation |
| Authentication | Keycloak as its own layer between edge and services; OIDC flows (authorization code + PKCE on the front end, client credentials between services); where the JWT is validated (Traefik forward-auth / oauth2-proxy, gateway, or service via JWKS); realms and clients; Keycloak's own DB; HA cluster with distributed cache, or the login SPOF accepted; sessions, refresh and revocation |

### 5. Build and deliver
Generate the diagram from a JSON spec, never by hand: the builder enforces spacing and legibility that hand-drawn JSON drifts from.

1. Write `<name>.spec.json` following `references/diagram-spec.md`.
2. `python scripts/fetch_icons.py --out <dir>/icons <icon names>`. If an icon is missing, run `--search <term>` before accepting the initials badge.
3. `python scripts/build_excalidraw.py <name>.spec.json --icons <dir>/icons --out <name>.excalidraw --preview <name>.svg`
4. Fix every `ERROR` in the spec and rebuild. Resolve `WARN`s unless there is a reason not to.
5. Look at the SVG preview (convert with `cairosvg` if you can view PNGs): no arrow crossing a box, readable labels, complete legend, no group swallowing foreign nodes. Iterate on the spec, not on the output.
6. Deliver the `.excalidraw` **and** the spec, so later updates are cheap. It opens at excalidraw.com or in the Excalidraw VS Code extension. If an Excalidraw MCP tool is available and the user prefers it, send the generated elements there.

Closing message, kept short: option drawn, estimates table (if not shown yet), remaining SPOFs with mitigation, and 1 or 2 next scaling steps. Do not relist components; the diagram does that.

## Update rules
- Keep ids and positions of untouched nodes so the diagram stays familiar; new nodes take free cells.
- Record the change in a note titled `Changes <yyyy-mm-dd>` (what and why).
- Redo the SPOF sweep and the estimates when traffic or data assumptions change.

## Out of scope
IaC code (Terraform, Compose): the skill sizes and draws, it does not provision. Non-infra diagrams (detailed ERD, sequence diagrams, UI flows): use another tool.
