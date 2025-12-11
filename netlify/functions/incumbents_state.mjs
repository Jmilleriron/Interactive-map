
export default async (req, context) => {
  try {
    const urlObj = new URL(req.url);
    const abbr = urlObj.searchParams.get('abbr');
    const fips = urlObj.searchParams.get('fips');
    if (!abbr || !fips) return new Response(JSON.stringify({ error: 'missing abbr or fips' }), { status: 400 });
    const csvUrl = `https://data.openstates.org/people/current/${abbr}.csv`;
    const r = await fetch(csvUrl);
    const text = await r.text();
    const lines = text.split(/?
/).filter(l=>l.trim().length);
    const header = lines[0].split(',');
    const idx = (name)=> header.indexOf(name);
    const i_chamber = idx('current_chamber');
    const i_district = idx('current_district');
    const i_name = idx('name');
    const i_party = idx('current_party');
    const i_phone = idx('capitol_voice');
    const out = {};
    for (let k=1;k<lines.length;k++){
      const row = lines[k].split(',');
      const chamber = row[i_chamber];
      const dist = row[i_district];
      const name = row[i_name];
      const party = (row[i_party]||'').trim();
      const phone = (row[i_phone]||'').trim();
      if (!chamber || !dist) continue;
      const partyInit = party.startsWith('Dem') ? 'D' : party.startsWith('Rep') ? 'R' : party.substring(0,1);
      if (chamber === 'upper') {
        const key = `SLDU:${fips}-${dist}`;
        out[key] = { incumbent: name, party: partyInit, phone };
      } else if (chamber === 'lower') {
        const key = `SLDL:${fips}-${dist}`;
        out[key] = { incumbent: name, party: partyInit, phone };
      }
    }
    return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'failed to build state incumbents', details: String(err) }), { status: 500 });
  }
}
