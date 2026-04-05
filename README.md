# Tachyon

> **This project is entirely AI-generated.** It may or may not work as intended. Use at your own risk, verify behaviour before deploying to anything critical, and expect rough edges.

A hyper-minimalist, keyboard-driven start page and dashboard for self-hosters. No frameworks, no bundlers, no backend — just static files served by Nginx, configured at runtime via a single YAML file.

Here are some looks:
<img width="2720" height="1666" alt="image" src="https://github.com/user-attachments/assets/d9bb1f2f-22c1-49a4-ab6d-59f88b698df3" />
<img width="2732" height="1662" alt="image" src="https://github.com/user-attachments/assets/13ad1b6c-11c5-48e1-b436-f63bf83b7d3a" />


---

## Table of Contents

- [How it works](#how-it-works)
- [Deployment](#deployment)
  - [Docker (single container)](#docker-single-container)
  - [Docker Compose](#docker-compose)
  - [Kubernetes](#kubernetes)
- [Configuration reference](#configuration-reference)
  - [Minimal example](#minimal-example)
  - [Full-featured example](#full-featured-example)
  - [Schema](#schema)
- [Navigation and keyboard shortcuts](#navigation-and-keyboard-shortcuts)
- [Search behaviour](#search-behaviour)
- [Design notes](#design-notes)

---

## How it works

Tachyon is a pure static web app. On load, the browser fetches `config.yaml` from the same origin, parses it with `js-yaml`, and builds the entire UI from the result. There is no server-side rendering and no API. All navigation state lives in the browser.

Because `config.yaml` is fetched at runtime (not baked into the image), you can update your dashboard without rebuilding the container — just remount a new config and reload the page.

---

## Deployment

### Docker (single container)

Build the image locally and run it with your config bind-mounted:

```sh
docker build -t tachyon:latest .

docker run -d \
  --name tachyon \
  -p 8080:80 \
  -v "$(pwd)/config.yaml:/usr/share/nginx/html/config.yaml:ro" \
  tachyon:latest
```

The dashboard is then available at `http://localhost:8080`.

The `config.yaml` is **not** baked into the image. The container will fail to load your services if the file is not mounted. Mount it read-only (`:ro`) to prevent the container from modifying it.

### Docker Compose

A `docker-compose.yaml` is included for local development and simple self-hosted setups:

```yaml
services:
  tachyon:
    build: .
    ports:
      - "8080:80"
    volumes:
      - ./config.yaml:/usr/share/nginx/html/config.yaml:ro
```

Run with:

```sh
docker compose up -d
```

To rebuild after a source change:

```sh
docker compose up -d --build
```

### Kubernetes

Two manifests are provided in `k8s/`:

| File | Purpose |
|---|---|
| `k8s/configmap.yaml` | Stores `config.yaml` as a ConfigMap named `tachyon-config` |
| `k8s/deployment.yaml` | Deployment + Service; mounts the ConfigMap as a file |

**Step 1 — edit the ConfigMap** with your own services:

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tachyon-config
  namespace: default
data:
  config.yaml: |
    services:
      - name: My Group
        shortcut: m
        ...
```

**Step 2 — apply both manifests:**

```sh
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
```

The Deployment mounts the ConfigMap at `/usr/share/nginx/html/config.yaml` using a `subPath` mount, so only that file is affected. The Service exposes port 80 inside the cluster; add an Ingress or change the Service type to `LoadBalancer` / `NodePort` as needed for external access.

To update the config without redeploying:

```sh
kubectl edit configmap tachyon-config
# or
kubectl apply -f k8s/configmap.yaml
```

Nginx will serve the updated file on the next page load. No pod restart is required.

> **Note:** The `k8s/configmap.yaml` uses the legacy flat-array config format (a plain list at the top level). This is still supported — see [Schema](#schema) for the difference.

---

## Configuration reference

### Minimal example

The smallest valid config defines one group containing one service:

```yaml
services:
  - name: Dev
    shortcut: d
    icon: "💻"
    keywords: [dev]
    children:
      - name: GitHub
        shortcut: g
        icon: "🐙"
        keywords: [git, github]
        url: https://github.com
```

No `taglines` key means the tagline bar is hidden.

### Full-featured example

```yaml
# Optional. One string is picked at random on each page load.
# Omit the key entirely (or set to null) to hide the tagline bar.
taglines:
  - "Where to?"
  - "sudo navigate"
  - "Which rabbit hole today?"

services:
  - name: Infra
    shortcut: i
    icon: "🖥️"
    keywords: [infra, infrastructure, server, ops]
    children:
      - name: Proxmox
        shortcut: p
        icon: "🧱"
        keywords: [proxmox, vm, virtual, hypervisor]
        url: https://proxmox.local:8006
      - name: Monitoring
        shortcut: m
        icon: "📊"
        keywords: [monitoring, metrics]
        children:
          - name: Grafana
            shortcut: g
            icon: "📊"
            keywords: [grafana, metrics, dashboard]
            url: https://grafana.local:3000
          - name: Prometheus
            shortcut: p
            icon: "🔥"
            keywords: [prometheus, metrics, alerts]
            url: https://prometheus.local:9090
```

Groups can be nested to arbitrary depth. Each level is navigated by pressing the shortcut key for the group.

### Schema

#### Top-level keys

| Key | Type | Required | Description |
|---|---|---|---|
| `services` | array of Group | yes (object format) | Root-level groups or services. |
| `taglines` | array of strings | no | One entry is shown at random below the breadcrumb bar. Omit or set to `null` to hide. |

**Legacy format:** If `config.yaml` contains a plain YAML array at the top level (no `services` key), Tachyon treats it as the root service list and always shows a built-in tagline. The object format with explicit `services` and `taglines` keys is preferred.

#### Group item

| Key | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Display name shown on the tile and in the breadcrumb bar. |
| `shortcut` | string (single character) | yes | Keyboard key that activates this item. Case-sensitive. |
| `icon` | string | yes | Displayed above the name. Any emoji, character, or short string works. |
| `keywords` | array of strings | yes | Used by the fuzzy search. Include synonyms and abbreviations. |
| `children` | array of Group or Service | yes (groups only) | Nested items. Presence of this key is what makes an item a group rather than a service. |

#### Service item

| Key | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Display name. |
| `shortcut` | string (single character) | yes | Keyboard key that opens the URL in a new tab. |
| `icon` | string | yes | Displayed on the tile and in search results. |
| `keywords` | array of strings | yes | Used by the fuzzy search. |
| `url` | string | yes | Full URL opened in a new tab when the service is activated. |

**Shortcut uniqueness:** Shortcuts are scoped to their current view level. Two items in different groups can share the same shortcut key without conflict. Two siblings with the same shortcut will both activate — the first match in the array wins.

---

## Navigation and keyboard shortcuts

Tachyon is designed to be driven entirely from the keyboard. The mouse works as a fallback.

### Global shortcuts (active any time, outside search)

| Key | Action |
|---|---|
| `<shortcut>` | Activate the item whose shortcut matches the pressed key in the current view. Groups drill down; services open in a new tab and reset to root. |
| `/` | Open search scoped to the **current group** (only services reachable from here). |
| `?` | Open search scoped to **all services** in the entire config. |
| `Escape` | Navigate back one level (same as browser back). At root, does nothing. |

### In-search shortcuts

| Key | Action |
|---|---|
| `ArrowDown` | Move selection down the results list. |
| `ArrowUp` | Move selection up the results list. |
| `Enter` | Open the selected result (or the first result if none is selected) in a new tab, then close search and reset to root. |
| `Escape` | Close search without navigating. |

### Mouse / browser navigation

- Clicking a tile activates it (same behaviour as pressing its shortcut key).
- Clicking a breadcrumb crumb navigates directly to that level.
- The browser back button (including the mouse back button) navigates up one level.

### UX notes

- After opening a service (by shortcut, `Enter` in search, or click), the dashboard resets to the root view automatically.
- Group tiles are visually distinguished by a ` /` suffix on their name.
- The shortcut key is shown as a badge in the top-right corner of each tile.

---

## Search behaviour

Pressing `/` or `?` opens a full-screen search overlay.

- **Scope:** `/` searches only services reachable from the current group. `?` searches all services in the entire config regardless of where you are.
- **Match corpus:** Each service is matched against a concatenation of its `name` and all entries in its `keywords` array.
- **Algorithm:** Fuzzy, case-insensitive, sequential character match. Each character in your query must appear in order somewhere in the corpus, but gaps are allowed. For example, `grf` matches `grafana`.
- **Highlighting:** Matched characters in the service name and individual keyword tags are highlighted in the accent colour.
- **Result order:** Matches are returned in config-file order. There is no relevance ranking.
- **Opening a result:** Click any result, or use `ArrowUp`/`ArrowDown` to select then press `Enter`. If nothing is selected and you press `Enter`, the first result is opened.

---

## Design notes

- **Dark mode only.** There is no light theme and no toggle.
- **No external network requests.** `js-yaml` is vendored (`src/vendor/js-yaml.min.js`). The app works fully offline once the page has loaded, as long as `config.yaml` is reachable on the same origin.
- **All animations are CSS-only** (`transform`, `opacity`) and hardware-accelerated. JavaScript is never used for visual transitions.
- **Font size is fluid** (`clamp(15px, 1.1vw, 18px)`) and scales with the viewport.
- **Tile grid** uses `auto-fill` with a column width of `clamp(160px, 14vw, 220px)`, so the number of columns adapts to the available width automatically.
