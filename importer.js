/* XLSX importer: parse sheets, normalize keys/values, merge records */

const SHEET_MACRO = 'MACRO_COD_UL';
const SHEET_CONSULTA = 'CONSULTA MASSIVA';
const SHEET_MASCARAS = 'MASCARAS ABERTURA';

const KEY_SYNONYMS = {
  cod_ul: [
    'cod ul','codigo ul','cod_ul','cod. ul','ponto logico','ponto logico / designacao',
    'ponto logico/designacao','ponto logico /designacao','ponto logico / designacao'
  ],
  nome_loterica: ['nome da loterica','nome ul','nome loterica','loterica'],
  endereco: ['endereco','endereco ul'],
  contato: ['contato'],
  uf: ['uf','estado'],
  cidade: ['cidade','municipio','municipio/estado'],
  status: ['status','status ul'],
  operadora: ['operadora','operadora backup'],
  ccto_oi: ['ccto oi','base un','designacao','designacao ccto','designacao/ccto'],
  ccto_oemp: ['ccto oemp','circuito oemp','circuito oemp'],
  ip_nat: ['ip nat','ip de nat'],
  ip_wan: ['ip wan'],
  loopback_wan: ['loopback principal','loopback primario','loopback primario','loopback principal wan'],
  loopback_lan: ['loopback switch','loopback secundario','loopback backup','loopback lan'],
};

function normalizeKey(raw){
  if(!raw) return '';
  const text = String(raw).toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
  return text.replace(/\s+/g,'_');
}

const SYN_MAP = (function(){
  const map = {};
  for(const [canon, list] of Object.entries(KEY_SYNONYMS)){
    map[normalizeKey(canon)] = canon;
    for(const v of list) map[normalizeKey(v)] = canon;
  }
  return map;
})();

function canonicalKey(raw){
  const nk = normalizeKey(raw);
  return SYN_MAP[nk] || nk;
}

function normalizeValue(value){
  if(value === null || value === undefined) return '';
  if(typeof value === 'string') return value.trim();
  if(typeof value === 'number'){
    if(Number.isInteger(value)) return String(value);
    return String(value);
  }
  if(value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function normalizeRow(row){
  const out = {};
  for(const [k, v] of Object.entries(row)){
    const key = canonicalKey(k);
    const val = normalizeValue(v);
    if(!key) continue;
    if(val !== '') out[key] = val;
  }
  return out;
}

function normalizeSheetName(name){
  return String(name || '').toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function findSheet(workbook, target){
  const want = normalizeSheetName(target);
  return workbook.SheetNames.find((n)=> normalizeSheetName(n) === want);
}

function findSheetWithCodUl(workbook){
  for(const name of workbook.SheetNames){
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, {header:1, range:0});
    const header = rows[0] || [];
    for(const col of header){
      if(canonicalKey(col) === 'cod_ul') return name;
    }
  }
  return null;
}

function mergeRecords(base, extra, stats){
  for(const [k, v] of Object.entries(extra)){
    if(v === '') continue;
    if(!base[k]){
      base[k] = v;
      continue;
    }
    if(base[k] !== v){
      const keep = (String(v).length > String(base[k]).length) ? v : base[k];
      if(keep !== base[k]) base[k] = keep;
      stats.conflicts += 1;
    }
  }
  return base;
}

function parseTemplates(rows){
  const templates = [];
  let idx = 1;
  for(const row of rows){
    const r = normalizeRow(row);
    const name = r.tipo || r.nome || r.titulo || r.id || `template_${idx}`;
    const text = r.template || r.mascara || r.texto || r.conteudo || '';
    if(!text) continue;
    templates.push({id: `tpl_${idx}`, name, text});
    idx += 1;
  }
  return templates;
}

async function importXlsxFile(file){
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, {type:'array'});
  let sheetMacro = findSheet(wb, SHEET_MACRO);
  if(!sheetMacro) sheetMacro = findSheetWithCodUl(wb);
  if(!sheetMacro) sheetMacro = wb.SheetNames[0] || null;
  const sheetConsulta = findSheet(wb, SHEET_CONSULTA);
  const sheetMascaras = findSheet(wb, SHEET_MASCARAS);

  const report = {
    fileName: file.name,
    importedAt: new Date().toISOString(),
    sheetsFound: [sheetMacro, sheetConsulta, sheetMascaras].filter(Boolean),
    primarySheet: sheetMacro || '',
    totalLines: 0,
    validRecords: 0,
    ignored: 0,
    conflicts: 0,
    fields: [],
    extraFromConsulta: 0,
  };

  const map = new Map();
  const statsAttachment = {conflicts: 0};

  function loadSheet(name){
    if(!name) return [];
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], {defval:''});
    report.totalLines += rows.length;
    return rows;
  }

  const macroRows = loadSheet(sheetMacro);
  for(const row of macroRows){
    const r = normalizeRow(row);
    const code = r.cod_ul;
    if(!code){
      report.ignored += 1;
      continue;
    }
    map.set(code, r);
  }

  const consultaRows = loadSheet(sheetConsulta);
  for(const row of consultaRows){
    const r = normalizeRow(row);
    const code = r.cod_ul;
    if(!code){
      report.ignored += 1;
      continue;
    }
    if(map.has(code)){
      const base = map.get(code);
      mergeRecords(base, r, statsAttachment);
    } else {
      map.set(code, r);
      report.extraFromConsulta += 1;
    }
  }

  report.conflicts = statsAttachment.conflicts;
  report.validRecords = map.size;

  const allFields = new Set();
  for(const record of map.values()){
    for(const k of Object.keys(record)) allFields.add(k);
  }
  report.fields = Array.from(allFields).sort();

  const templates = sheetMascaras
    ? parseTemplates(loadSheet(sheetMascaras))
    : [];

  const records = Array.from(map.values());
  return {records, report, templates};
}
