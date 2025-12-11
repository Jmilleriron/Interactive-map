
# Interactive Map — Districts + Cancelled Projects

Features:
- Cancelled Projects pins (red) — loaded from KML.
- U.S. Congressional Districts (119th) polygons.
- State Legislative Districts — Upper (SLDU) & Lower (SLDL) via state picker.
- District pop-ups show **Incumbent, Party, Capitol phone**.

Deploy (Netlify recommended):
1. Drag this folder (or zip) to Netlify (Deploy manually) or connect via Git.
2. Ensure Node 18 (set via UI or .nvmrc) for functions.

Sources:
- Census Cartographic Boundary Files (GENZ2024 KML). 
- Leaflet.KMZ for zipped KML loading. 
- U.S. House members from unitedstates/congress-legislators. 
- State legislators from OpenStates nightly CSV.
