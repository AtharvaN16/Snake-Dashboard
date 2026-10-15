# Snake Image Management Guide

This guide covers the complete workflow for managing snake images in the dashboard, including sourcing, processing, and maintaining image quality.

## Table of Contents

1. [Overview](#overview)
2. [Initial Setup](#initial-setup)
3. [Automated Image Processing](#automated-image-processing)
4. [Manual Image Replacement](#manual-image-replacement)
5. [Image Validation](#image-validation)
6. [Troubleshooting](#troubleshooting)
7. [Attribution Guidelines](#attribution-guidelines)

## Overview

The image management system provides:

- **Automated sourcing** from Wikimedia Commons and iNaturalist
- **Natural photos** with original backgrounds (no AI background removal)
- **Standardized storage** with attribution tracking
- **Gallery support** for multiple images per snake
- **Quality validation** to ensure consistency
- **Manual replacement** workflow for review and updates

### Image Specifications

- **Primary Image**: 800x600px JPEG (display on detail page)
- **Thumbnail**: 300x225px JPEG (display on cards)
- **Original Backup**: Original downloaded image (JPG)
- **Gallery Images**: Optional 2-3 additional photos
- **Attribution**: JSON file with license and source info

## Initial Setup

### 1. No Dependencies Required

The simplified pipeline uses only Node.js/Bun - no Python dependencies needed!

### 2. Verify Setup

```bash
bun run setup:check
```

## Automated Image Processing

### Batch Process All Snakes

Process images for all 100 snakes automatically:

```bash
# Primary images only (faster)
bun run images:process

# With gallery images (2-3 additional photos per snake)
bun run images:process --gallery
```

**Features:**
- Searches Wikimedia Commons first, then iNaturalist
- Downloads best quality image (prefers full-body shots >1200px width)
- Creates primary and thumbnail versions with natural backgrounds
- Saves attribution metadata
- Skips snakes that already have images
- Respects API rate limits (2s delay between requests)

**Expected Time**: 
- Primary only: ~10-15 minutes for 100 snakes
- With gallery: ~20-30 minutes for 100 snakes

**Output:**
- Images saved to `public/images/snakes/[snake-id]/`
- Processing report: `temp/processing-report.json`
- Failed snakes list: `temp/failed-snakes.json`

### Understanding the Pipeline

1. **Search APIs**: Queries Wikimedia Commons and iNaturalist
2. **Filter by License**: Only CC0, CC-BY, CC-BY-SA images
3. **Quality Scoring**: Prefers full-body shots, landscape orientation, high resolution
4. **Download**: Saves original image
5. **Resize**: Creates primary (800x600) and thumbnail (300x225) as JPEG
6. **Gallery**: Optionally downloads 2-3 additional images
7. **Save Attribution**: Stores license and source info

### Image Selection Criteria

**Scoring system (max 100 points):**
- Size: Up to 40 points (prefer >2000px width)
- Aspect ratio: 30 points for landscape (1.2-2.5 ratio)
- Full-body bonus: 20 points for complete snake visible

**Preferred images:**
- Full-body shots showing entire snake
- Clear, well-lit photographs
- Landscape orientation
- Plain or natural backgrounds
- High resolution (>1200px minimum)

## Manual Image Replacement

Replace a snake's image manually (e.g., for better quality or failed automated processing):

```bash
bun run images:replace <snake-id> <image-path>
```

**Example:**

```bash
bun run images:replace inland-taipan ~/Downloads/taipan-photo.jpg
```

**What it does:**
1. Backs up existing images to `backup/` subdirectory
2. Processes the new image (resize to primary and thumbnail)
3. Creates attribution.json with placeholder info
4. **Important**: You must manually update attribution.json with correct license

### Updating Attribution After Manual Upload

Edit `public/images/snakes/[snake-id]/attribution.json`:

```json
{
  "photographer": "Jane Photographer",
  "source": "iNaturalist",
  "sourceUrl": "https://www.inaturalist.org/observations/123456",
  "license": "CC BY 4.0",
  "licenseUrl": "https://creativecommons.org/licenses/by/4.0/"
}
```

After updating attribution, rebuild the snake data:

```bash
bun run data:build
```

## Image Validation

Validate all snake images for quality and completeness:

```bash
bun run images:validate
```

**Checks:**
- ✓ All required files exist (primary.jpg, thumbnail.jpg, attribution.json)
- ✓ Images meet minimum dimensions
- ✓ Original backup exists
- ✓ Gallery metadata valid (if gallery images present)

**Output:**
- Console report with errors and warnings
- Detailed JSON report: `temp/validation-report.json`
- Exit code 1 if errors found, 0 if warnings only

### Common Validation Issues

| Issue | Severity | Solution |
|-------|----------|----------|
| Image directory not found | Error | Run automated processing or manual replacement |
| primary.jpg not found | Error | Reprocess the snake image |
| Image too small | Warning | Source higher resolution image |
| Attribution needs verification | Warning | Update attribution.json manually |
| Gallery metadata missing | Warning | Run with --gallery flag or add metadata manually |

## Troubleshooting

### No Images Found for Snake

**Symptom**: No suitable images found during automated processing

**Causes:**
- Scientific name misspelling
- Rare species with limited photos
- No openly licensed images available
- Rate limits (429) from both Wikimedia and iNaturalist

**Solutions:**
1. **Retry failed only** (recommended): After a run, failed snake IDs are saved to `temp/failed-snakes.json`. Retry just those with longer delays:
   ```bash
   bun run images:retry-failed
   ```
   This processes only the 22 (or fewer) failed snakes with 5s between requests and 15s between batches, so rate limits are less likely.
2. **Retry later**: Run `bun run images:process` again in a few hours or the next day; it skips snakes that already have images.
3. Manually search Wikimedia Commons or iNaturalist, download an image, then:
   ```bash
   bun run images:replace <snake-id> <path-to-image.jpg>
   ```
   Then edit `public/images/snakes/<snake-id>/attribution.json` with the correct license and source, and run `bun run data:build`.
4. Check alternative scientific names/synonyms in the data if the species has limited photo coverage.

### API Rate Limiting

**Symptom**: Failed downloads, "429 Too Many Requests"

**Automatic fallback**: When Wikimedia Commons returns 429, the pipeline automatically tries **iNaturalist** for that snake (and vice versa). Many rate-limited snakes will still get an image from the other source.

**If both sources are rate-limited:**
1. Increase delay in processAllSnakes.ts (current: 2 seconds)
2. Process in smaller batches
3. Wait 30–60 minutes and run again (skips existing, retries failures)
4. Use manual replacement for remaining failed snakes

### Image Won't Display in UI

**Symptoms**: Emoji placeholder shown instead of image

**Checks:**
1. File exists: `public/images/snakes/[snake-id]/thumbnail.jpg`
2. File permissions are readable
3. Attribution JSON is valid
4. Rebuild snake data: `bun run data:build`
5. Clear Next.js cache: `rm -rf .next`
6. Check browser console for errors

### Poor Image Quality

**Symptoms**: Blurry, low resolution, or poorly composed

**Solutions:**
1. Find better source image manually
2. Use manual replacement workflow
3. Check for alternative photos in APIs
4. Adjust scoring criteria if needed

## Attribution Guidelines

### Acceptable Licenses

Only use images with these licenses:
- **CC0** (Public Domain): No attribution required but recommended
- **CC BY 4.0**: Requires attribution
- **CC BY-SA 4.0**: Requires attribution and share-alike

### Attribution Format

Always include:
1. **Photographer/Creator**: Name or username
2. **Source**: Platform (Wikimedia Commons, iNaturalist)
3. **Source URL**: Direct link to original
4. **License**: Full license name (e.g., "CC BY 4.0")
5. **License URL**: Link to license terms

### Example Attribution

```json
{
  "photographer": "John Smith",
  "source": "Wikimedia Commons",
  "sourceUrl": "https://commons.wikimedia.org/wiki/File:Snake.jpg",
  "license": "CC BY-SA 4.0",
  "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/"
}
```

### Where Attribution Appears

- Snake detail page (below hero image)
- Gallery images (if present)
- Data file (`data/snakes/index.json`)
- Attribution JSON file (for reference)

## API Rate Limits

### Wikimedia Commons
- No strict limit
- Recommended: ~1 request/second
- User-Agent required (automatically set)

### iNaturalist
- Limit: 60 requests/minute
- Requires User-Agent header (automatically set)
- Be respectful of their API

### Best Practices
- Process in batches with delays
- Cache results when possible
- Don't make redundant requests
- Handle errors gracefully

## Directory Structure

```
snake-dashboard/
├── public/
│   └── images/
│       └── snakes/
│           ├── inland-taipan/
│           │   ├── primary.jpg              # 800x600 display image
│           │   ├── thumbnail.jpg            # 300x225 card image
│           │   ├── original.jpg             # Original download
│           │   ├── attribution.json         # License info
│           │   ├── gallery/                 # Optional gallery images
│           │   │   ├── 1.jpg
│           │   │   ├── 2.jpg
│           │   │   └── 3.jpg
│           │   ├── gallery-metadata.json    # Gallery attributions
│           │   └── backup/                  # Old images (if replaced)
│           │       └── [timestamp]-*.jpg
│           └── [other-snake-ids]/
├── scripts/
│   ├── imageProcessing.ts           # Image utilities (resize, optimize)
│   ├── sourceSnakeImages.ts         # API integration
│   ├── processAllSnakes.ts          # Batch processor
│   ├── replaceSnakeImage.ts         # Manual replacement
│   └── validateImages.ts            # Quality validation
└── temp/
    ├── processing-report.json       # Batch processing results
    ├── validation-report.json       # Validation results
    └── failed-snakes.json           # Snakes needing manual work
```

## Command Reference

```bash
# Check setup
bun run setup:check

# Batch process all snakes (primary only)
bun run images:process

# Batch process with gallery images
bun run images:process --gallery

# Retry only the snakes that failed last time (from temp/failed-snakes.json)
# Uses longer delays to reduce rate limiting. Run after a full batch.
bun run images:retry-failed

# Replace single snake image
bun run images:replace <snake-id> <image-path>

# Validate all images
bun run images:validate

# Rebuild snake database
bun run data:build
```

## Tips for Best Results

1. **Source Quality Images**
   - Prefer 1200px+ width
   - Full-body or coiled pose works best
   - Good lighting and focus
   - Natural backgrounds acceptable

2. **Image Processing**
   - Fast - no AI processing needed
   - JPEG format for smaller file sizes
   - Neutral beige background for contain fit
   - Cover crop for thumbnail consistency

3. **Manual Review**
   - Spot-check automated results
   - Replace problematic images manually
   - Verify attribution accuracy
   - Run validation regularly

4. **Performance**
   - Use thumbnail for card views (faster loading)
   - Primary image lazy-loads on detail page
   - JPEG smaller than PNG
   - Next.js Image component handles optimization

## Getting Help

If you encounter issues:

1. Check this documentation first
2. Review error messages in console
3. Check validation report for specific issues
4. Examine failed-snakes.json for patterns
5. Test with single snake before batch processing

## Future Enhancements

Potential improvements to consider:

- Lightbox/modal for gallery images
- WebP format support for smaller files
- Image CDN integration
- Automated quality scoring
- Machine learning for pose detection
- User-contributed photos
