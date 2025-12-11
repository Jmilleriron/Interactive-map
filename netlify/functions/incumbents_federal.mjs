
export default async (req, context) => {
  try {
    const url = 'https://raw.githubusercontent.com/unitedstates/congress-legislators/gh-pages/legislators-current.json';
    const res = await fetch(url);
    const data = await res.json();
    const now = new Date();
    const out = {};
    for (const person of data) {
      const terms = person.terms || [];
      const latest = terms[terms.length - 1];
      if (!latest) continue;
      if (latest.type !== 'rep') continue; // U.S. House only
      const end = latest.end ? new Date(latest.end) : null;
      if (end && end < now) continue; // not current
      const state = latest.state;
      let district = latest.district;
      if (district === 0 || district === '0') district = 'At-Large';
      const key = `CD119:${state}-${district}`;
      const party = latest.party || '';
      const phone = latest.phone || '';
      const name = (person.name && (person.name.official_full || `${person.name.first} ${person.name.last}`)) || '';
      const partyInit = party.startsWith('Dem') ? 'D' : party.startsWith('Rep') ? 'R' : party.substring(0,1);
      out[key] = { incumbent: name, party: partyInit, phone };
    }
    return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'failed to build federal incumbents', details: String(err) }), { status: 500 });
  }
}
