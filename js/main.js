
// Base map
const map = L.map('map').setView([39.5, -98.35], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);

// Popup helpers
function popupHTML(title, meta) {
  const { incumbent, party, phone } = meta || {};
  const ptxt = party ? (party === 'D' ? 'Democrat' : party === 'R' ? 'Republican' : party) : '—';
  return `
    <div class="popup">
      <h4>${title}</h4>
      <div class="meta">
        <span><strong>Incumbent:</strong> ${incumbent || '—'}</span>
        <span><strong>Party:</strong> ${ptxt}</span>
        <span><strong>Capitol phone:</strong> ${phone || '—'}</span>
      </div>
    </div>
  `;
}
function extractNum(s) { const m = (s||'').match(/(\d{1,3})/); return m ? m[1] : null; }
function statefpToAbbr(fp) {
  const map = {"01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE","11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE","32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND","39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD","47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV","55":"WI","56":"WY","60":"AS","66":"GU","69":"MP","72":"PR","78":"VI"};
  return map[fp] || null;
}
function getDistrictKey(props, layerType) {
  const name = props.NAME || props.name || "";
  const statefp = props.STATEFP || props.StateFP || "";
  const sldu = props.SLDU || props.DISTRICT || "";
  const sldl = props.SLDL || props.DISTRICT || "";
  if (layerType === 'CD119') {
    const stateCode = statefpToAbbr(statefp);
    const distNum = extractNum(name);
    if (stateCode && distNum) return `CD119:${stateCode}-${distNum}`;
  } else if (layerType === 'SLDU') {
    const distCode = sldu || extractNum(name);
    if (statefp && distCode) return `SLDU:${statefp}-${distCode}`;
  } else if (layerType === 'SLDL') {
    const distCode = sldl || extractNum(name);
    if (statefp && distCode) return `SLDL:${statefp}-${distCode}`;
  }
  return null;
}

// ---- Cancelled Projects KML (remote link) ----
const jobsUrl = "https://us-prod.asyncgw.teams.microsoft.com/v1/objects/0-wus-d6-02ec0524db0d5df5bea5914f7a65f51e/views/original/Cancelled_Projects.kml";
const jobsLayer = omnivore.kml(jobsUrl)
  .on('ready', function () {
    const redIcon = L.icon({ iconUrl: 'https://maps.google.com/mapfiles/kml/paddle/red-circle.png', iconSize: [32,32], iconAnchor: [16,32] });
    this.eachLayer(function (layer) {
      if (layer.setIcon) layer.setIcon(redIcon);
      if (layer.bindPopup) {
        const p = layer.feature?.properties?.name || 'Cancelled Project';
        const d = layer.feature?.properties?.description || '';
        layer.bindPopup(`<strong>${p}</strong><div>${d}</div>`);
      }
    });
  })
  .on('error', (e)=>console.error('Jobs KML error', e))
  .addTo(map);

document.getElementById('jobsCb').addEventListener('change', e=>{
  if (e.target.checked) jobsLayer.addTo(map); else map.removeLayer(jobsLayer);
});

// ---- U.S. Congressional Districts (119th) nationwide ----
const cdUrl = 'https://www2.census.gov/geo/tiger/GENZ2024/kml/cb_2024_us_cd119_20m.zip';
const cdGroup = L.layerGroup();
document.getElementById('cdCb').addEventListener('change', (e)=>{
  if (e.target.checked) {
    const kmzParser = new L.KMZParser();
    kmzParser.on('loaded', async function(evt){
      const layer = evt.layer;
      let incMap = {};
      try {
        const r = await fetch('/.netlify/functions/incumbents_federal');
        incMap = await r.json();
      } catch (err) { console.warn('Federal incumbents fetch failed', err); }
      layer.eachLayer(function(l){
        if (l.setStyle) l.setStyle({color:'#3366cc', weight:1, fillOpacity:0.15});
        const props = l.feature?.properties || {};
        const title = props.NAME || props.name || 'Congressional District';
        const key = getDistrictKey(props, 'CD119');
        const meta = key ? incMap[key] : null;
        l.bindPopup(popupHTML(title, meta || {}));
      });
      cdGroup.addLayer(layer);
      cdGroup.addTo(map);
    });
    kmzParser.load(cdUrl);
  } else {
    map.removeLayer(cdGroup);
    cdGroup.clearLayers();
  }
});

// ---- State SLDU/SLDL loader (by FIPS + postal abbr) ----
const slduGroup = L.layerGroup().addTo(map);
const sldlGroup = L.layerGroup().addTo(map);

async function loadStateLayers(fips, abbr) {
  const slduUrl = `https://www2.census.gov/geo/tiger/GENZ2024/kml/cb_2024_${fips}_sldu_500k.zip`;
  const sldlUrl = `https://www2.census.gov/geo/tiger/GENZ2024/kml/cb_2024_${fips}_sldl_500k.zip`;
  let incMap = {};
  try {
    const r = await fetch(`/.netlify/functions/incumbents_state?abbr=${encodeURIComponent(abbr)}&fips=${encodeURIComponent(fips)}`);
    incMap = await r.json();
  } catch (err) { console.warn('State incumbents fetch failed', err); }
  // SLDU
  const kmzS = new L.KMZParser();
  kmzS.on('loaded', function(evt){
    const lyr = evt.layer;
    lyr.eachLayer(function(l){
      if (l.setStyle) l.setStyle({color:'#cc33aa', weight:1, fillOpacity:0.12});
      const props = l.feature?.properties || {};
      const title = props.NAME || props.name || 'State Senate District';
      const key = getDistrictKey(props, 'SLDU');
      const meta = key ? incMap[key] : null;
      l.bindPopup(popupHTML(title, meta || {}));
    });
    slduGroup.addLayer(lyr); slduGroup.addTo(map);
  });
  kmzS.load(slduUrl);
  // SLDL
  const kmzL = new L.KMZParser();
  kmzL.on('loaded', function(evt){
    const lyr = evt.layer;
    lyr.eachLayer(function(l){
      if (l.setStyle) l.setStyle({color:'#33aa33', weight:1, fillOpacity:0.12});
      const props = l.feature?.properties || {};
      const title = props.NAME || props.name || 'State House District';
      const key = getDistrictKey(props, 'SLDL');
      const meta = key ? incMap[key] : null;
      l.bindPopup(popupHTML(title, meta || {}));
    });
    sldlGroup.addLayer(lyr); sldlGroup.addTo(map);
  });
  kmzL.load(sldlUrl);
}

document.getElementById('loadStateBtn').addEventListener('click', ()=>{
  const fips = document.getElementById('stateSelect').value;
  const abbr = document.getElementById('stateAbbrSelect').value;
  if (!fips || !abbr) { alert('Pick both FIPS and postal code.'); return; }
  loadStateLayers(fips, abbr);
});

document.getElementById('clearStateBtn').addEventListener('click', ()=>{
  map.removeLayer(slduGroup); slduGroup.clearLayers(); slduGroup.addTo(map);
  map.removeLayer(sldlGroup); sldlGroup.clearLayers(); sldlGroup.addTo(map);
});
