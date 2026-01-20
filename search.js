/* Search index for records */

function normalizeSearchText(s){
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .replace(/\s+/g,' ')
    .trim();
}

function buildSearchIndex(records){
  const mapByCodUl = new Map();
  const list = [];
  for(const r of records){
    if(!r || !r.cod_ul) continue;
    mapByCodUl.set(r.cod_ul, r);
    const hay = normalizeSearchText([
      r.cod_ul,
      r.nome_loterica,
      r.ccto_oi,
      r.ccto_oemp,
      r.operadora,
      r.ip_nat,
      r.ip_wan,
      r.loopback_wan,
      r.loopback_lan,
      r.endereco,
      r.contato,
      r.status,
      r.cidade,
      r.uf,
    ].filter(Boolean).join(' | '));
    list.push({record: r, hay});
  }
  return {mapByCodUl, list};
}

function searchRecords(index, query){
  if(!index || !query) return [];
  const q = normalizeSearchText(query);
  if(!q) return [];
  if(index.mapByCodUl.has(query.trim())) return [index.mapByCodUl.get(query.trim())];
  const out = [];
  for(const item of index.list){
    if(item.hay.includes(q)) out.push(item.record);
  }
  return out;
}

function getSuggestions(index, query, limit){
  const out = [];
  const list = searchRecords(index, query);
  for(const r of list){
    if(!r.cod_ul) continue;
    out.push({
      value: r.cod_ul,
      label: `${r.cod_ul} - ${r.nome_loterica || ''}`.trim(),
    });
    if(out.length >= limit) break;
  }
  return out;
}

function normalizeQuery(raw){
  if(raw === undefined || raw === null) return '';
  return String(raw)
    .normalize('NFKC')
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function isLikelyCodUl(raw){
  const digits = String(raw || '').replace(/\D/g,'');
  return digits.length === 9;
}

function buildCodUlCandidates(raw){
  const digits = String(raw || '').replace(/\D/g,'');
  const seen = new Set();
  const trimmed = String(raw || '').trim();
  if(trimmed) seen.add(trimmed);
  if(digits){
    seen.add(digits);
    if(digits.length === 9){
      seen.add(`${digits.slice(0,2)}-${digits.slice(2,8)}-${digits.slice(8)}`);
    }
  }
  return Array.from(seen);
}
