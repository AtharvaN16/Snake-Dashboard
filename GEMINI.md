# GEMINI.md - Snake Dashboard Context

## Project Overview

**Snake Dashboard** (also known as "Is It Venomous?") is a comprehensive, searchable web database focused on venomous snakes. It provides detailed profiles, calculate danger scores based on multiple factors (venom potency, yield, aggression, etc.), and ranks snakes by danger level.

The project is a modern web application built with **Next.js 14+ (App Router)**, **TypeScript**, and **Tailwind CSS 4**. It emphasizes a clean, semantic UI and includes a custom data processing pipeline for managing snake data and images.

### Tech Stack

-   **Framework:** Next.js 14+ (App Router)
-   **Language:** TypeScript
-   **Styling:** Tailwind CSS 4, shadcn/ui
-   **Package Manager:** Bun
-   **Search:** Fuse.js (fuzzy search)
-   **Icons:** Lucide React
-   **Maps:** react-simple-maps, D3-geo (GeoJSON)

## Building and Running

This project uses **Bun** as its package manager and script runner.

### Prerequisites
-   Bun (v1.0+)
-   Node.js 18+ (for compatibility)

### Core Commands

| Command | Description |
| :--- | :--- |
| `bun run dev` | Starts the development server at `http://localhost:3000`. |
| `bun run build` | Builds the application for production. |
| `bun run start` | Starts the production server. |
| `bun run lint` | Runs ESLint for code quality checks. |

### Data & Image Management Scripts

The project includes a robust set of scripts in the `scripts/` directory for managing data and assets.

| Command | Description |
| :--- | :--- |
| `bun run data:build` | Rebuilds the snake database (`data/snakes/index.json`). |
| `bun run images:process` | Processes snake images (fetches, resizes, optimizes). |
| `bun run images:validate` | Validates image quality and dimensions. |
| `bun run images:test` | Runs a test pilot of the image processing workflow on a small subset. |
| `bun run setup:check` | Verifies the development environment setup. |

## Project Structure

```
snake-dashboard/
├── app/                  # Next.js App Router pages and layouts
│   ├── page.tsx          # Home page
│   ├── snakes/[id]/      # Individual snake detail pages
│   └── rank/             # Danger ranking leaderboard
├── components/           # React components
│   ├── ui/               # Reusable UI components (shadcn/ui)
│   ├── SnakeCard.tsx     # Card component for snake listing
│   └── ...               # Domain-specific components (DangerScore, Maps, etc.)
├── data/                 # Data storage
│   └── snakes/           # Main JSON database
├── lib/                  # Utilities and business logic
│   ├── types.ts          # TypeScript interfaces (Snake, VenomPotency, etc.)
│   ├── snakeData.ts      # Data loading and access patterns
│   └── dangerScore.ts    # Scoring algorithm logic
├── public/               # Static assets
│   ├── images/snakes/    # Processed snake images
│   └── geojson/ranges/   # Range map data (GeoJSON)
└── scripts/              # Data processing and maintenance scripts
```

## Development Conventions

### Coding Style
-   **Strict Typing:** Extensive use of TypeScript interfaces (defined in `lib/types.ts`) to ensure data integrity.
-   **Component Structure:** Functional components with distinct responsibilities. UI components are separated from feature components.
-   **Styling:** Utility-first CSS using Tailwind. Design system focuses on a "clean, modern, beige/neutral" aesthetic.

### Data Model
-   **Source of Truth:** `data/snakes/index.json` is the central database.
-   **Danger Score:** A composite score (0-100) calculated from Venom Potency (30%), Yield (25%), Aggression (20%), Encounter Frequency (15%), and Medical Availability (10%).

### Maps & Geography
-   **Range Maps:** Uses GeoJSON polygons for species distribution.
-   **Source:** Authoritative data (IUCN/GARD) processed via `scripts/extractAuthoritativeRanges.ts`.
