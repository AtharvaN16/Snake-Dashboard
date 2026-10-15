# 🐍 Is It Venomous? - Venomous Snake Database

A comprehensive, searchable database of the world's most dangerous venomous snakes, featuring detailed information on venom characteristics, danger scores, symptoms, and medical data.

**Live Demo:** *Coming soon*

## Features

- 🔍 **Searchable Database** - Fuzzy search across snake names (common and scientific)
- 📊 **Danger Score Rankings** - Composite scoring system based on venom potency, yield, aggression, encounter frequency, and medical availability
- 🎯 **Detailed Snake Profiles** - Comprehensive information including:
  - Venom types and characteristics (Hemotoxic, Neurotoxic, Cytotoxic, etc.)
  - LD50 values and venom yield data
  - Three-phase symptom progression (Short-term, Progressive, Critical)
  - Geographic distribution and habitat information
  - Taxonomy and classification
- 🎨 **Clean, Modern UI** - Inspired by "Is It Toxic To?" with a beautiful beige/neutral color palette
- ⚡ **Fast & Responsive** - Built with Next.js 14+ and optimized for performance
- ♿ **Accessible** - Semantic HTML and WCAG AA compliant

## Tech Stack

- **Framework:** [Next.js 14+](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/)
- **Search:** [Fuse.js](https://fusejs.io/) (fuzzy search)
- **Package Manager:** [Bun](https://bun.sh/)
- **Icons:** [Lucide React](https://lucide.dev/)

## Project Structure

```
snake-dashboard/
├── app/
│   ├── page.tsx                    # Home page with searchable list
│   ├── snakes/[id]/page.tsx       # Individual snake detail pages
│   ├── layout.tsx                  # Root layout
│   └── globals.css                 # Global styles
├── components/
│   ├── ui/                         # shadcn/ui base components
│   ├── VenomTypeChip.tsx          # Venom type badge component
│   ├── DangerScoreBar.tsx         # Danger score visualization
│   ├── SearchBar.tsx              # Search input component
│   └── SnakeCard.tsx              # Snake list item component
├── lib/
│   ├── types.ts                    # TypeScript type definitions
│   ├── snakeData.ts               # Data loading utilities
│   ├── dangerScore.ts             # Danger score calculation
│   ├── searchUtils.ts             # Search and filtering logic
│   └── utils.ts                    # General utilities
├── data/
│   └── snakes/
│       └── index.json             # Snake database (JSON)
├── public/
│   └── images/
│       └── snakes/                # Snake images
└── .cursor/
    └── rules/
        └── CODING-STANDARDS.md    # Development guidelines
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- Node.js 18+ (for compatibility)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd snake-dashboard
```

2. Install dependencies:
```bash
bun install
```

3. Run the development server:
```bash
bun run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Danger Score Algorithm

The composite danger score (0-100) is calculated using weighted components:

- **Venom Potency (LD50)** - 30%: Lower LD50 = more potent = higher score
- **Venom Yield** - 25%: Higher yield = higher score  
- **Temperament/Aggression** - 20%: More aggressive = higher score
- **Human Encounter Frequency** - 15%: More encounters = higher score
- **Medical Availability** - 10%: Less access to antivenom = higher score

Snakes are then ranked from most to least dangerous based on their final score.

## Data Sources

### Primary Sources

1. **WHO Snakebite Information Platform** - 373 medically important venomous snake species
2. **Snake Venom Database (SVDB)** - Venom composition and LD50 values
3. **snakeDB.org** - Referenced toxicity and morphology data
4. **Wikipedia** - General species information and distribution
5. **The Reptile Database** - Taxonomy verification

### Data Collection

- Manually curated for accuracy and medical relevance
- Cross-referenced across multiple sources
- All data includes source citations for transparency

## Development

### Code Standards

This project follows strict coding standards outlined in `.cursor/rules/CODING-STANDARDS.md`:

- **File size limit:** Maximum 300 lines per file
- **Single Responsibility:** Each function/component does one thing well
- **Type safety:** No `any` types, explicit TypeScript interfaces
- **Early returns:** Guard clauses to reduce nesting
- **Modular design:** Small, reusable, composable functions

### Available Scripts

```bash
# Development
bun run dev          # Start development server
bun run build        # Build for production
bun run start        # Start production server
bun run lint         # Run ESLint

# Image Management
bun run images:test      # Test image processing on 5 snakes
bun run images:process   # Process all 100 snake images
bun run images:validate  # Validate image quality
bun run images:replace <snake-id> <image-path>  # Replace single image

# Data Management
bun run data:build   # Rebuild snake database with updated images
```

## Image Management

The dashboard includes a simplified image processing system for high-quality snake photos with natural backgrounds.

### Quick Start

1. **No setup required** - Pure TypeScript, no Python dependencies!

2. **Test the workflow** (5 snakes):
   ```bash
   bun run images:test
   ```

3. **Process all images** (10-15 minutes):
   ```bash
   # Primary images only
   bun run images:process
   
   # With gallery images (2-3 extra photos per snake)
   bun run images:process --gallery
   ```

4. **Validate results**:
   ```bash
   bun run images:validate
   ```

### Features

- 🤖 **Automated Sourcing**: Searches Wikimedia Commons and iNaturalist
- 🖼️ **Natural Photos**: Uses images with original backgrounds (no AI artifacts)
- 📏 **Standardized Sizing**: Primary (800x600) and thumbnail (300x225) versions
- 🎨 **Gallery Support**: Optional 2-3 additional images showing snake features
- 📝 **Attribution Tracking**: Automatic license and source metadata
- ✅ **Quality Validation**: Checks dimensions and completeness
- 🔄 **Manual Override**: Easy replacement workflow for custom images
- ⚡ **3x Faster**: No background removal processing

### Image Specifications

- **Primary**: 800×600px JPEG with natural background
- **Thumbnail**: 300×225px JPEG (cropped to fill cards)
- **Gallery**: Optional 2-3 additional views
- **Format**: JPEG (smaller file sizes)
- **Licenses**: CC0, CC BY, CC BY-SA only

For detailed instructions, see [docs/IMAGE_MANAGEMENT.md](docs/IMAGE_MANAGEMENT.md)

## Roadmap

### Completed ✅
- [x] Next.js project setup with TypeScript and Tailwind
- [x] Data schema and type definitions
- [x] Initial snake database (5 species)
- [x] Searchable home page with list view
- [x] Individual snake detail pages
- [x] Fuzzy search functionality
- [x] Danger score visualization
- [x] Ranked leaderboard

### In Progress 🚧
- [ ] Contact snakeDB.org for data usage permission
- [ ] Source and process high-quality snake images
- [ ] Expand database to 25-30 species

### Planned 🎯
- [ ] Advanced filtering (by venom type, family, region)
- [ ] Interactive distribution maps
- [ ] First aid information section
- [ ] Comparison tool (compare 2+ snakes)
- [ ] Mobile app version
- [ ] API endpoints for developers
- [ ] Dark mode support

## Contributing

Contributions are welcome! Please read our coding standards in `.cursor/rules/CODING-STANDARDS.md` before submitting PRs.

### Data Contributions

If you'd like to contribute snake data:

1. Use the existing JSON schema in `lib/types.ts`
2. Include citations from reliable sources (WHO, scientific papers, etc.)
3. Cross-reference data across at least 2 sources
4. Submit a PR with your additions

## License

*To be determined*

## Acknowledgments

- Inspired by [Is It Toxic To?](https://iitt.chester.how/) by Chester
- Data sources: WHO, SVDB, snakeDB.org, Wikipedia, The Reptile Database
- Built with ❤️ for herpetology enthusiasts and medical professionals

## Disclaimer

⚠️ **Medical Disclaimer:** This database is for educational purposes only. In case of a snakebite, always seek immediate medical attention. Do not rely solely on this information for medical decisions.

---

**Researched 🔬 by Atharva**
