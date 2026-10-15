# Rankings Edit Mode (Dev-Only)

The Snake Dashboard features a specialized **Edit Mode** on the Rankings page (`/rank`) available exclusively in the development environment (`process.env.NODE_ENV === 'development'`).

This mode allows for rapid data curation, image management, and database expansion without leaving the browser.

---

## 1. Accessing Edit Mode

-   Navigate to the **Rankings** page.
-   Look for the **"Edit"** button (pencil icon) in the top right corner, next to the Region filter.
-   Click to toggle the interface.

---

## 2. Features

### Image Management
-   Each snake row gains a **"Primary/Gal"** button.
-   This opens the **Image Candidate Picker**, which searches Wikimedia Commons and iNaturalist for CC-licensed images.
-   You can set the **Primary Image** (and thumbnail) or add multiple images to the **Gallery**.
-   Image processing (resizing, optimization) happens automatically via the server.

### Data Generation & Regeneration
-   **Description (Sparkles icon)**: Fetches a summary from Wikipedia based on the snake's scientific name.
-   **AKA (Plus icon)**: (Coming soon) Will suggest alternative common names.
-   Regenerated fields are stored in `data/manualEdits.json` under `fieldOverrides`.

### Database Management
-   **Delete**: Flags a snake for removal. The ID is added to `deletedIds` in `manualEdits.json`.
-   **Add New Snake**: Use the search bar at the top of the table. Enter a **scientific name**. The system will bootstrap a new entry with basic data from Wikipedia.

---

## 3. Persistence & The Build Pipeline

Because the main database (`data/snakes/index.json`) is a generated file, manual browser edits use a two-step persistence strategy to survive rebuilds:

1.  **Direct File System Changes**: Image files (`primary.jpg`, `gallery/`) and their metadata are written directly to `public/images/snakes/[id]/`. The build script preserves these directories.
2.  **`manualEdits.json`**: Structural changes (deletions, additions, field overrides) are saved to `data/manualEdits.json`.

### Applying Changes Permanently
After making changes in Edit Mode (especially adding/deleting snakes or regenerating descriptions), you **must** run the build script to update the main database rankings and danger scores:

```bash
bun run data:build
```

The build script merges data in this order:
1.  Base entries from the script logic.
2.  Existing `index.json` data.
3.  **Manual Edits** (overrides and new additions).
4.  **Deletions** (removes flagged IDs).

---

## 4. Fragility & Rebuild Considerations

-   **Manual JSON Edits**: Avoid editing `data/snakes/index.json` manually; use Edit Mode or edit `scripts/build100Snakes.ts` instead.
-   **Image Cache**: The dev server uses atomic writes for images to prevent `sharp` from locking files, but a browser refresh may be needed to see new thumbnails.
-   **ID Conflicts**: When adding a new snake, ensure the scientific name is correct, as it generates the snake's unique `id`.
