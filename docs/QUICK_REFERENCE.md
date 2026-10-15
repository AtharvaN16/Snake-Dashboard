# 🐍 Snake Dashboard - Image System Quick Reference

## Getting Started

### 1. First-Time Setup
```bash
# Check if everything is ready (no Python needed!)
bun run setup:check
```

### 2. Test the System (5 snakes)
```bash
bun run images:test
```
✓ Processes: Inland Taipan, Black Mamba, King Cobra, Gaboon Viper, Reticulated Python
✓ Takes: ~1-2 minutes (3x faster than before!)
✓ Output: `public/images/snakes/[snake-id]/`

### 3. Review Test Results
```bash
# Open the generated images
open public/images/snakes/inland-taipan/

# Check quality - natural backgrounds, no AI artifacts
```

### 4. Process All Images
```bash
# Primary images only (faster)
bun run images:process

# With gallery images (2-3 extra photos per snake)
bun run images:process --gallery
```
✓ Processes: All 100 snakes
✓ Takes: 10-15 minutes (primary only) or 20-30 minutes (with gallery)
✓ Report: `temp/processing-report.json`

### 5. Validate Results
```bash
bun run images:validate
```
✓ Checks: Dimensions, file formats, attribution
✓ Report: `temp/validation-report.json`

## Daily Commands

```bash
# Check system status (no Python required)
bun run setup:check

# Replace a specific image
bun run images:replace snake-id ~/path/to/image.jpg

# Rebuild snake database (after changes)
bun run data:build

# Validate all images
bun run images:validate

# Start dev server
bun run dev
```

## File Locations

| Type | Location |
|------|----------|
| Snake images | `public/images/snakes/[id]/` |
| Primary (display) | `primary.jpg` (800×600) |
| Thumbnail (card) | `thumbnail.jpg` (300×225) |
| Original backup | `original.jpg` |
| Gallery images | `gallery/1.jpg, 2.jpg, 3.jpg` |
| Attribution | `attribution.json` |
| Gallery metadata | `gallery-metadata.json` |
| Processing reports | `temp/processing-report.json` |
| Failed snakes | `temp/failed-snakes.json` |
| Validation report | `temp/validation-report.json` |

## Troubleshooting

### "No images found for snake"
- Scientific name might be misspelled
- Try manual sourcing from Wikimedia/iNaturalist
- Use manual replacement workflow

### "Image won't display in UI"
1. Check file exists: `public/images/snakes/[id]/thumbnail.jpg`
2. Rebuild database: `bun run data:build`
3. Clear Next.js cache: `rm -rf .next && bun run dev`

### "Poor image quality"
- Use manual replacement with better source
- Check for higher resolution versions
- Try different photo from API results

## Image Requirements

✅ **Acceptable**
- CC0, CC BY, CC BY-SA licenses
- Minimum 1200px width
- JPEG or PNG format
- Snake clearly visible
- Natural backgrounds OK

❌ **Not Acceptable**
- All rights reserved
- Low resolution (<800px)
- Watermarked images
- Poor quality/blurry

## Quick Tips

💡 No Python dependencies required
💡 3x faster processing (no AI background removal)
💡 Natural photos with original backgrounds
💡 Use --gallery flag for multiple images per snake
💡 Attribution is automatically handled
💡 Full-body shots preferred

## Documentation

📖 Full guide: `docs/IMAGE_MANAGEMENT.md`
📊 Implementation: `docs/IMPLEMENTATION_SUMMARY.md`
🏠 Main README: `README.md`

## Support

- Setup issues: `bun run setup:check`
- Processing errors: Check `temp/processing-report.json`
- Validation failures: `bun run images:validate`
- General help: See `docs/IMAGE_MANAGEMENT.md`

---

**Remember**: Natural photos, no background removal, 3x faster! 🐍
