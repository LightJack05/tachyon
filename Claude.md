# Project: Tachyon

## Core Concept
Tachyon is a hyper-minimalist, blazing-fast, keyboard-driven start page and dashboard. It is designed for power users who want instant navigation without touching a mouse. 

## Architecture & Constraints
- **Frontend:** Vanilla JS, HTML5, CSS3. **STRICT RULE:** No UI frameworks (React, Vue, etc.), no bundlers (Webpack/Vite), no CSS libraries (Tailwind). Only include what is absolutely necessary to keep the web app as fast as possible.
- **External Dependency:** Only use `js-yaml` (via vendor folder or CDN) to parse the configuration at runtime.
- **Hosting:** Static files served via an Nginx Alpine Docker container. No backend code.
- **Data Loading:** The app dynamically fetches `config.yaml` at runtime (to allow Kubernetes ConfigMap volume mounts without rebuilding the container).

## Hosting and Server
- **Docker Container** The app must be built into a docker container that is fully self contained, aside from the config. Use a minimal base image and only include what is necessary.
- **Local dev environment** Create a local docker-compose.yaml file to allow for local running and debugging.

## Data Model (YAML Schema)
The entire dashboard is driven by a single YAML file. The data is inherently recursive (Groups can contain Services or other Groups).
Every Service or Group MUST support at least these properties:
- `name`: Display name.
- `shortcut`: A single key character (e.g., `e`, `i`, `m`) used to trigger this item.
- `icon`: Identifier for the icon, or a PNG/JPEG/etc. (can be an emoji, SVG path, or class name depending on implementation).
- `keywords`: Array of strings for the fuzzy search (e.g., `["git", "repo", "source"]`).
- `url`: (Services only) The target link (e.g. https://foo.bar.local:8080/baz).
- `children`: (Groups only) An array of nested Groups or Services.

## Navigation & UX Flow
The core interaction is entirely keyboard-driven.
1. **The Root View:** On initial load, the user is presented with Tiles representing the root-level Groups.
2. **Drilling Down:** Pressing a shortcut key assigned to a Group (e.g., `e` for External) visually drills down into that folder. The view updates to show the `children` of that group.
3. **Triggering Services:** Pressing a shortcut key assigned to a Service opens its `url` in a **new tab**. 
4. **Auto-Reset:** Immediately after opening a Service, the dashboard MUST reset its state back to the Root View.
5. **Global Search:** Pressing `/` at any time intercepts the input and opens a full-text fuzzy search overlay across all services.
6. **Mouse Fallback:** While optimized for keyboards, tiles must still be clickable.

## Design & Animations
- **Theme:** Dark mode only. Clean, high-contrast, uncluttered.
- **Animations:** Must be hardware-accelerated (`transform`, `opacity`). JavaScript must NOT be used for animations.
- **Interactions:**
  - Fast, slick zoom-in effect when drilling down into a Group.
  - Hover/focus states should feature subtle neon/glow effects and slight scaling (`transform: scale()`).
  - Pop-in/pop-up effects for the search overlay.

## Code Style & Guidelines
- **DOM Manipulation:** Minimize reflows. Build DOM trees in memory using `DocumentFragment` before swapping views.
- **Keyboard Handling:** Event listeners for shortcuts must be globally attached to the `window`. Ensure typing in the search bar does not trigger global shortcuts. 

## Folder Structure
- `src/` (index.html, app.js, style.css, vendor/js-yaml.min.js)
- `config.yaml` (Mounted at runtime via K8s, used as the single source of truth)
- `Dockerfile` (Minimal Nginx Alpine setup serving `/src`)
