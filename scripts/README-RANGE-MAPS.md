# Authoritative Range Map Pipeline

The distribution map on each snake detail page must use **authoritative species polygons** (no synthetic fallback shapes). Range data comes from **per-snake GeoJSON** files generated from a validated source.

## Overview

1. **Download** an authoritative polygon dataset (IUCN Squamata or GARD 1.7).
2. **Extract** one GeoJSON file per snake by matching scientific name.
3. Use the generated files at `public/geojson/ranges/<snake-id>.json`.

## Step 1: Download authoritative polygons

- Go to [IUCN Red List Spatial Data Download](https://www.iucnredlist.org/resources/spatial-data-download).
- Under **Reptiles**, download **Scaled Reptiles (Squamata)** – polygon (shapefile). Size ~1.31GB.
- Accept the terms (non-commercial use). Extract the archive.

Alternative source:
- [GARD 1.7 (global terrestrial reptiles)](https://datadryad.org/dataset/doi:10.5061/dryad.9cnp5hqmb) (polygon shapefile).

## Step 2: Extract per-snake GeoJSON files

From the repo root:

```bash
# Shapefile source (.shp + .dbf)
npx tsx scripts/extractAuthoritativeRanges.ts --source /absolute/path/to/ranges.shp --format shp

# GeoJSON source (FeatureCollection)
npx tsx scripts/extractAuthoritativeRanges.ts --source /absolute/path/to/ranges.geojson --format geojson
```

Optional:

- Override species name field:
  - `--name-field sci_name`
- Change output directory:
  - `--out public/geojson/ranges`

The extractor:
- Loads `data/snakes/index.json`
- Matches source species name to `scientificName` (case-insensitive normalized)
- Writes one file per snake at `public/geojson/ranges/<snake.id>.json`

## Step 3: Optional conversion to GeoJSON first

If you prefer GDAL conversion first:

```bash
ogr2ogr -f GeoJSON ranges.geojson /absolute/path/to/ranges.shp
npx tsx scripts/extractAuthoritativeRanges.ts --source /absolute/path/to/ranges.geojson --format geojson
```

Snakes without a matching authoritative polygon are skipped (no guessed shape is generated).

## Step 4: Using the range files in the app

The **DistributionMap** component looks for range data in this order:

1. **Inline** `distribution.geometry` (Polygon or MultiPolygon) in the snake JSON.
2. **Static file**: if `distribution.rangeGeoJsonPath` is set (e.g. `/geojson/ranges/gaboon-viper.json`), that URL is fetched.
3. **Convention**: otherwise the component may try `/geojson/ranges/<snake.id>.json` (if you use that convention).

If none are present, the map shows as unavailable (no synthetic approximation).

## Manual / curated GeoJSON

For species missing in your authoritative source or for corrections:

- Create a GeoJSON file with one or more Polygon/MultiPolygon features (or a FeatureCollection containing one feature with that geometry).
- Save it as `public/geojson/ranges/<snake-id>.json`.
- Optionally set `distribution.rangeGeoJsonPath` in the snake data to that path (e.g. `/geojson/ranges/<snake-id>.json`).

You can draw or edit polygons in [mapshaper.org](https://mapshaper.org/) or QGIS and export as GeoJSON.

## References

- [IUCN Red List Spatial Data](https://www.iucnredlist.org/resources/spatial-data-download)
- [GARD 1.7 dataset](https://datadryad.org/dataset/doi:10.5061/dryad.9cnp5hqmb)
- [Mapping Standards and Data Quality for IUCN Red List Spatial Data](https://www.iucnredlist.org/resources/mappingstandards) (e.g. `sci_name` attribute)
- [RFC 7946 – The GeoJSON Format](https://datatracker.ietf.org/doc/html/rfc7946)
