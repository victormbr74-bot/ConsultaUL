/*
  Static app: XLSX import -> IndexedDB -> search/masks
*/

let DB = null;
let INDEX = null;
let CURRENT = null;
let CUSTOM_CAUSES = [];
let ABERTURA_EDITED = false;
let MASK_SUBTAB = 'abertura';

const VIEWS = ['consulta','mascara','importar','loterica'];
const META_IMPORT = 'import_info';
const META_CUSTOM_CAUSES = 'custom_causes';
const META_ABERTURA_STATE = 'abertura_min_state';
const META_ENCERRAMENTO_STATE = 'encerramento_min_state';

const STORAGE_LAST_QUERY = 'last_query';
const STORAGE_ABERTURA_TIPO = 'abertura_tipo';
const STORAGE_ABERTURA_DEFECT = 'abertura_defeito';
const STORAGE_ABERTURA_RECLAMACAO = 'abertura_reclamacao';
const STORAGE_ABERTURA_EDITED = 'abertura_editada';
const STORAGE_ENC_FAIL = 'enc_fail';
const STORAGE_ENC_CAUSE = 'enc_cause';
const STORAGE_ENC_CONTACT_NAME = 'enc_contact_name';
const STORAGE_ENC_CONTACT_PHONE = 'enc_contact_phone';
const STORAGE_ENC_AUTO = 'enc_auto';
const STORAGE_ENC_TEMPO = 'enc_tempo';
const STORAGE_ENC_QUEDA = 'enc_queda';
const STORAGE_ENC_NORM = 'enc_norm';
const STORAGE_CUSTOM_CAUSES = 'customCauses';
const AUTO_BASE_URL = './base.xlsx';
const AUTO_BASE_WARNING = 'Base automática não encontrada. Use Importar XLSX.';
const AUTO_LAST_UPDATE_EMPTY = 'Última atualização: nunca';
let AUTO_LOAD_IN_PROGRESS = false;

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls) => { const n=document.createElement(tag); if(cls) n.className=cls; return n; };

function setMaskText(text){
  $('#maskText').textContent = text || '';
}

function getMaskText(){
  return $('#maskText').textContent || '';
}

function pickField(r, keys){
  for(const k of keys){
    if(r && r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '') return r[k];
  }
  return '';
}

function getRecordCode(r){
  return pickField(r, ['cod_ul','COD. UL','Ponto Logico','Ponto Lógico','Ponto Logico / \nDesignacao','Ponto Lógico / \nDesignação']);
}

function setStatus(target, lines){
  const box = $(target);
  box.innerHTML = '';
  for(const line of lines){
    const row = el('div');
    row.textContent = line;
    box.appendChild(row);
  }
}

function setAutoLoadWarning(text){
  const note = $('#autoLoadNote');
  if(!note) return;
  note.textContent = text || '';
}

function setResultsHint(text){
  $('#results').innerHTML = `<div class="hint">${text}</div>`;
}

function escapeHtml(text){
  return String(text || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}

function setSearchEnabled(enabled){
  $('#btnBuscar').disabled = !enabled;
}

function formatDateTimeMinutes(date){
  const pad = (x)=> String(x).padStart(2,'0');
  const dd = pad(date.getDate());
  const mm = pad(date.getMonth()+1);
  const yyyy = date.getFullYear();
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function safeNumber(value){
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

function formatSourceLabel(source){
  if(source === 'site') return 'XLSX do site';
  if(source === 'upload') return 'Upload local';
  return 'Importação manual';
}

function formatList(list){
  if(Array.isArray(list) && list.length) return list.join(', ');
  return '-';
}

function buildImportReportLines(report){
  if(!report) return ['Nenhuma base importada.'];
  const importedAtLabel = report.importedAt && !Number.isNaN(new Date(report.importedAt).getTime())
    ? formatDateTimeMinutes(new Date(report.importedAt))
    : '-';
  const lines = [
    `Arquivo: ${report.fileName || '-'}`,
    `Importado em: ${importedAtLabel}`,
    `Fonte: ${formatSourceLabel(report.source)}`,
    `Total de linhas: ${safeNumber(report.totalLines)}`,
    `Registros validos: ${safeNumber(report.validRecords)}`,
    `Ignorados (sem cod_ul): ${safeNumber(report.ignored)}`,
    `Aba principal: ${report.primarySheet || '-'}`,
    `Abas encontradas: ${formatList(report.sheetsFound)}`,
    `Campos finais: ${formatList(report.fields)}`,
    `Conflitos: ${safeNumber(report.conflicts)}`,
  ];
  if(report.importedAt){
    const parsed = new Date(report.importedAt);
    if(!Number.isNaN(parsed.getTime())){
      const suffix = report.source === 'site' ? ' (base.xlsx)' : '';
      lines.push(`Última atualização: ${formatDateTimeMinutes(parsed)}${suffix}`);
    }
  }
  return lines;
}

function updateLastUpdateLabel(importInfo){
  const label = $('#lastUpdateInfo');
  if(!label) return;
  if(importInfo && importInfo.importedAt){
    const date = new Date(importInfo.importedAt);
    if(!Number.isNaN(date.getTime())){
      const suffix = importInfo.source === 'site' ? ' (base.xlsx)' : '';
      label.textContent = `Última atualização: ${formatDateTimeMinutes(date)}${suffix}`;
      return;
    }
  }
  label.textContent = AUTO_LAST_UPDATE_EMPTY;
}

function resolveSameOriginUrl(input){
  const raw = String(input || '').trim() || './base.xlsx';
  let urlObj;
  try{
    urlObj = new URL(raw, window.location.href);
  } catch {
    return {error: 'URL invalida.', url: null};
  }
  if(urlObj.origin !== window.location.origin){
    return {error: 'URL externa bloqueada. Use caminho relativo na raiz do site.', url: null};
  }
  const base = urlObj.pathname + urlObj.search;
  const sep = base.includes('?') ? '&' : '?';
  const finalUrl = `${base}${sep}v=${Date.now()}`;
  return {error: null, url: finalUrl, display: raw};
}

function uniqueList(list){
  const seen = new Set();
  const out = [];
  for(const item of list){
    const v = String(item);
    if(seen.has(v)) continue;
    seen.add(v);
    out.push(item);
  }
  return out;
}

function getAllCauses(){
  return uniqueList([...(ENCERRAMENTO_CAUSES || []), ...(CUSTOM_CAUSES || [])]);
}

function setMaskWarning(){
  const hasRecord = !!CURRENT;
  $('#maskWarning').classList.toggle('hidden', hasRecord);
}

function setMaskSubtab(tab){
  MASK_SUBTAB = tab;
  document.querySelectorAll('.subtab').forEach(b=>b.classList.toggle('active', b.dataset.subtab===tab));
  $('#view-mask-abertura').classList.toggle('hidden', tab !== 'abertura');
  $('#view-mask-encerramento').classList.toggle('hidden', tab !== 'encerramento');
  setMaskWarning();
  if(tab === 'abertura'){
    populateAberturaTiposSelect();
    requestAnimationFrame(refreshAbertura);
  }
  if(tab === 'encerramento'){
    prefillEncQuedaFromRecord();
    refreshEncerramentoMinimal();
  }
}

function populateEncerramentoOptions(){
  const falhaSel = $('#encFalha');
  falhaSel.innerHTML = '';
  for(const f of ENCERRAMENTO_FAILS || []){
    const opt = el('option');
    opt.value = f;
    opt.textContent = f;
    falhaSel.appendChild(opt);
  }

  const causaSel = $('#encCausa');
  causaSel.innerHTML = '';
  for(const c of getAllCauses()){
    const opt = el('option');
    opt.value = c;
    opt.textContent = c;
    causaSel.appendChild(opt);
  }
}

function populateAberturaDefeitos(){
  const sel = $('#abDefeito');
  sel.innerHTML = '';
  for(const d of ABERTURA_DEFEITOS || []){
    const opt = el('option');
    opt.value = d;
    opt.textContent = d;
    sel.appendChild(opt);
  }
  if(!sel.value && sel.options.length) sel.value = sel.options[0].value;
}

function populateAberturaTiposSelect(){
  const sel = document.getElementById('aberturaTipoSelect');
  if(!sel) return;
  if(typeof ABERTURA_TIPOS === 'undefined' || !Array.isArray(ABERTURA_TIPOS)) return;
  const current = sel.value;
  sel.innerHTML = '';
  for(const t of ABERTURA_TIPOS){
    const opt = el('option');
    opt.value = t.value;
    opt.textContent = t.label;
    sel.appendChild(opt);
  }
  const saved = localStorage.getItem(STORAGE_ABERTURA_TIPO) || 'oemp_oi';
  const prefer = current || saved;
  const exists = ABERTURA_TIPOS.some((t)=> t.value === prefer);
  sel.value = exists ? prefer : 'oemp_oi';
}

function ensureAberturaReclamacaoDefault(force){
  const defeito = $('#abDefeito').value;
  const padrao = getReclamacaoPadrao(defeito);
  if(force || !ABERTURA_EDITED){
    $('#abReclamacao').value = padrao;
    ABERTURA_EDITED = false;
  }
}

function getAberturaAutoFields(record){
  if(!record) return {};
  const rawQueda = pickField(record, ['data_hora_queda','DATA E HORA DA QUEDA','DATA/HORA QUEDA']);
  const parsedQueda = parseDatePt(rawQueda);
  const dataQueda = parsedQueda ? formatDateTimeMinutes(parsedQueda) : (rawQueda || '');
  return {
    designacao: pickField(record, ['designacao','ccto_oi','CCTO OI','BASE UN','Ponto Logico / Designacao','Ponto Lógico / \nDesignação']),
    cod_ul: getRecordCode(record),
    nome_ul: pickField(record, ['nome_loterica','NOME DA LOTERICA','NOME UL']),
    endereco: pickField(record, ['endereco','ENDERECO','ENDERECO UL']),
    contato_local: pickField(record, ['contato','CONTATO']),
    horario_funcionamento: pickField(record, ['horario_funcionamento','HORARIO DE FUNCIONAMENTO']),
    operadora: pickField(record, ['operadora','OPERADORA','OPERADORA BACKUP']),
    data_hora_queda: dataQueda,
  };
}

function getAberturaPayload(){
  return {
    record: CURRENT,
    defeito_reclamado: $('#abDefeito').value || '',
    reclamacao_inicial: $('#abReclamacao').value || '',
  };
}

function saveAberturaState(){
  const state = {
    tipo: $('#aberturaTipoSelect').value || '',
    defeito: $('#abDefeito').value || '',
    reclamacao: $('#abReclamacao').value || '',
    edited: ABERTURA_EDITED,
  };
  localStorage.setItem(STORAGE_ABERTURA_TIPO, state.tipo);
  localStorage.setItem(STORAGE_ABERTURA_DEFECT, state.defeito);
  localStorage.setItem(STORAGE_ABERTURA_RECLAMACAO, state.reclamacao);
  localStorage.setItem(STORAGE_ABERTURA_EDITED, state.edited ? '1' : '0');
  setMeta(DB, META_ABERTURA_STATE, state);
}

function applyAberturaState(state){
  if(!state) return;
  if(state.tipo) $('#aberturaTipoSelect').value = state.tipo;
  if(state.defeito) $('#abDefeito').value = state.defeito;
  if(state.reclamacao) $('#abReclamacao').value = state.reclamacao;
  ABERTURA_EDITED = !!state.edited;
}

function refreshAbertura(){
  if(!document.getElementById('aberturaTipoSelect')) return;
  populateAberturaTiposSelect();
  if(!$('#abDefeito').value) populateAberturaDefeitos();
  const payload = getAberturaPayload();
  const templateId = $('#aberturaTipoSelect').value || (ABERTURA_TIPOS[0] ? ABERTURA_TIPOS[0].value : '');
  let text = '';
  switch(templateId){
    case 'oemp_oi':
      text = buildMascaraOempOi(payload.record, payload.defeito_reclamado, payload.reclamacao_inicial);
      break;
    case 'mam_sct':
      text = buildMascaraMamSct(payload.record, payload.defeito_reclamado, payload.reclamacao_inicial);
      break;
    case 'ativa':
      text = buildMascaraAtiva(payload.record, payload.defeito_reclamado, payload.reclamacao_inicial);
      break;
    case 'wt_telecom':
      text = buildMascaraWtTelecom(payload.record, payload.defeito_reclamado, payload.reclamacao_inicial);
      break;
    default:
      text = '';
  }
  setMaskText(text);
  saveAberturaState();
}

function getQuedaDate(){
  const manual = $('#encQueda').value || '';
  const fromManual = parseDatePt(manual);
  if(fromManual) return fromManual;
  if(CURRENT){
    const raw = pickField(CURRENT, ['data_hora_queda','DATA E HORA DA QUEDA','DATA/HORA QUEDA']);
    const parsed = parseDatePt(raw);
    if(parsed) return parsed;
  }
  return null;
}

function normalizeManualNormalizacao(text){
  const parsed = parseDatePt(text);
  if(parsed) return formatDateTimeSeconds(parsed);
  const m = String(text || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if(m) return `${m[1]}/${m[2]}/${m[3]} ${m[4]}:${m[5]}:00`;
  return '';
}

function updateEncerramentoNormalizacao(){
  const auto = $('#encAuto').checked;
  $('#encTempo').disabled = !auto;
  $('#encNormalizacao').readOnly = auto;
  if(auto){
    const seconds = parseHoraMinutos($('#encTempo').value);
    const base = new Date();
    if(seconds === null){
      $('#encNormalizacao').value = '';
      $('#encStatus').textContent = 'Tempo invalido.';
      return '';
    }
    const normal = new Date(base.getTime() - (seconds * 1000));
    const text = formatDateTimeSeconds(normal);
    $('#encNormalizacao').value = text;
    $('#encStatus').textContent = '';
    return text;
  }
  const manual = normalizeManualNormalizacao($('#encNormalizacao').value);
  if(manual){
    $('#encNormalizacao').value = manual;
    $('#encStatus').textContent = '';
    return manual;
  }
  $('#encStatus').textContent = '';
  return '';
}

function getEncerramentoPayload(){
  const dataHora = updateEncerramentoNormalizacao() || formatDateTimeSeconds(new Date());
  return {
    falha: $('#encFalha').value || '',
    dataHora,
    causa: $('#encCausa').value || '',
    contatoNome: $('#encContatoNome').value || '',
    contatoTel: $('#encContatoTel').value || '',
  };
}

function saveEncerramentoState(){
  const state = {
    falha: $('#encFalha').value || '',
    causa: $('#encCausa').value || '',
    contatoNome: $('#encContatoNome').value || '',
    contatoTel: $('#encContatoTel').value || '',
    auto: $('#encAuto').checked,
    tempo: $('#encTempo').value || '',
    queda: $('#encQueda').value || '',
    normalizacao: $('#encNormalizacao').value || '',
  };
  localStorage.setItem(STORAGE_ENC_FAIL, state.falha);
  localStorage.setItem(STORAGE_ENC_CAUSE, state.causa);
  localStorage.setItem(STORAGE_ENC_CONTACT_NAME, state.contatoNome);
  localStorage.setItem(STORAGE_ENC_CONTACT_PHONE, state.contatoTel);
  localStorage.setItem(STORAGE_ENC_AUTO, state.auto ? '1' : '0');
  localStorage.setItem(STORAGE_ENC_TEMPO, state.tempo);
  localStorage.setItem(STORAGE_ENC_QUEDA, state.queda);
  localStorage.setItem(STORAGE_ENC_NORM, state.normalizacao);
  setMeta(DB, META_ENCERRAMENTO_STATE, state);
}

function applyEncerramentoState(state){
  if(!state) return;
  if(state.falha) $('#encFalha').value = state.falha;
  if(state.causa) $('#encCausa').value = state.causa;
  if(state.contatoNome) $('#encContatoNome').value = state.contatoNome;
  if(state.contatoTel) $('#encContatoTel').value = state.contatoTel;
  $('#encAuto').checked = !!state.auto;
  if(state.tempo) $('#encTempo').value = state.tempo;
  if(state.queda) $('#encQueda').value = state.queda;
  if(state.normalizacao) $('#encNormalizacao').value = state.normalizacao;
}

function refreshEncerramentoMinimal(){
  if(!$('#encFalha').value) populateEncerramentoOptions();
  const payload = getEncerramentoPayload();
  setMaskText(buildEncerramentoText(payload));
  saveEncerramentoState();
}

async function applyPostImport(prevCode){
  await loadFromIndexedDB();
  if(prevCode && INDEX && INDEX.mapByCodUl.has(prevCode)){
    CURRENT = INDEX.mapByCodUl.get(prevCode);
    renderConsulta(CURRENT);
  } else {
    CURRENT = null;
    renderConsulta(null);
  }
}

async function autoLoadBaseXlsx(){
  if(AUTO_LOAD_IN_PROGRESS) return false;
  AUTO_LOAD_IN_PROGRESS = true;
  const statusTarget = '#importStatus';
  setAutoLoadWarning('');
  setStatus(statusTarget, ['Buscando base.xlsx na raiz do site...']);
  try{
    const url = `${AUTO_BASE_URL}?v=${Date.now()}`;
    const res = await fetch(url, {cache:'no-store'});
    if(!res.ok){
      if(res.status === 404){
        setStatus(statusTarget, [AUTO_BASE_WARNING]);
        setAutoLoadWarning(AUTO_BASE_WARNING);
      } else {
        setStatus(statusTarget, [`Falha ao baixar base.xlsx (HTTP ${res.status}).`]);
      }
      return false;
    }
    const buffer = await res.arrayBuffer();
    const prevCode = CURRENT ? getRecordCode(CURRENT) : null;
    const {records, report} = importXlsxArrayBuffer(buffer, 'base.xlsx');
    report.source = 'site';
    report.importedAt = new Date().toISOString();
    setStatus(statusTarget, ['Salvando...']);
    await clearRecords(DB);
    await putManyRecords(DB, records);
    await setMeta(DB, META_IMPORT, report);
    await applyPostImport(prevCode);
    setStatus(statusTarget, buildImportReportLines(report));
    setAutoLoadWarning('');
    updateLastUpdateLabel(report);
    return true;
  } catch (err){
    console.error(err);
    setStatus(statusTarget, ['Erro ao baixar ou importar o XLSX do site.']);
    return false;
  } finally {
    AUTO_LOAD_IN_PROGRESS = false;
  }
}

function activateTab(tab){
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  for(const v of VIEWS){
    const view = document.querySelector(`#view-${v}`);
    if(view) view.classList.toggle('hidden', v!==tab);
  }
  if(tab === 'mascara') setMaskSubtab(MASK_SUBTAB);
}

function renderResults(list){
  const box = $('#results');
  box.innerHTML='';
  if(list.length===0){
    const p=el('div','hint');
    p.textContent='Nenhum resultado.';
    box.appendChild(p);
    return;
  }

  for(const r of list.slice(0,50)){
    const item=el('div','result-item');
    const left=el('div');
    const code = getRecordCode(r) || '-';
    const name = pickField(r, ['nome_loterica','NOME DA LOTERICA','NOME UL']);
    const uf = pickField(r, ['uf','UF']);
    const owner = pickField(r, ['owner','OWNER']);
    const mig = pickField(r, ['migracao','MIGRACAO','MIGRACAO']);
    const ccto = pickField(r, ['ccto_oi','ccto_oemp','CCTO OI','BASE UN','CCTO OEMP','CIRCUITO OEMP', 'DESIGNACAO NOVA']);

    const s=el('strong');
    s.textContent = `${code} - ${name || '-'}`;
    const m=el('div','meta');
    m.textContent = `UF: ${uf || '-'} | Owner: ${owner || '-'} | Migracao: ${mig || '-'} | CCTO/Designacao: ${ccto || '-'}`;
    left.appendChild(s); left.appendChild(m);

    const right=el('div','pick');
    const btn=el('button');
    btn.textContent='Selecionar';
    btn.addEventListener('click', ()=> selectRecord(code));
    right.appendChild(btn);

    item.appendChild(left); item.appendChild(right);
    box.appendChild(item);
  }

  const hint=el('div','hint');
  if(list.length>50){
    hint.textContent=`Mostrando 50 de ${list.length} resultados. Refine a busca.`;
  } else {
    hint.textContent=`${list.length} resultado(s).`;
  }
  box.appendChild(hint);
}

function renderConsulta(r){
  const empty = !r;
  $('#consulta-empty').classList.toggle('hidden', !empty);
  $('#consulta-layout').classList.toggle('hidden', empty);
  if(empty){
    ['#kv-loterica','#kv-principal','#kv-backup','#cmds'].forEach(sel=>$(sel).innerHTML='');
    return;
  }

  const val = (key)=> getField(r, key);
  const rawDesignacaoNova = val('designacao_nova');
  const designacaoNovaDisplay = (rawDesignacaoNova && rawDesignacaoNova !== 'ƒ?"')
    ? rawDesignacaoNova
    : '—';
  const loopP = val('loopback_primario');
  const loopB = val('loopback_backup');
  const ipNat = val('ip_nat');

  const putKV = (target, entries) => {
    const box = $(target);
    box.innerHTML='';
    for(const [k,v] of entries){
      const kk=el('div','k'); kk.textContent=k;
      const vv=el('div','v'); vv.textContent=(v && v !== '' ? v : '—');
      box.appendChild(kk); box.appendChild(vv);
    }
  };

  putKV('#kv-loterica', [
    ['CD UL OU CCTO', val('cd_ul_ou_ccto')],
    ['CODIGO DA UL', val('codigo_ul')],
    ['NOME UL', val('nome_ul')],
    ['STATUS', val('status')],
    ['CONTATO', val('contato')],
    ['UF', val('uf')],
    ['ENDERECO', val('endereco')],
    ['HOMOLO', val('homolo')],
    ['MIGRACAO', val('migracao')],
    ['MERAKI', val('meraki')],
    ['OWNER', val('owner')],
    ['TFL', val('tfl')],
    ['TIPO DE UL', val('tipo_ul')],
  ]);

  putKV('#kv-principal', [
    ['DESIGNACAO ATUAL/ANTIGA', val('designacao_atual_antiga')],
    ['DESIGNACAO NOVA', designacaoNovaDisplay],
    ['IP de NAT', ipNat],
    ['IP WAN', val('ip_wan')],
    ['LOOPBACK PRIMARIO', loopP],
    ['PERIMETRO', val('perimetro')],
    ['SWITCH', val('switch')],
    ['EMPRESA OEMP', val('empresa_oemp')],
    ['CIRCUITO OEMP', val('circuito_oemp')],
  ]);

  putKV('#kv-backup', [
    ['RESPONSAVEL BACKUP', val('responsavel_backup')],
    ['TECNOLOGIA', val('tecnologia_backup')],
    ['OPERADORA 4G', val('operadora_4g')],
    ['LOOPBACK BACKUP', loopB],
    ['REDE LAN', val('rede_lan')],
  ]);

  const cmds = $('#cmds');
  cmds.innerHTML='';
  const isMissing = (v)=> !v || v === '—';
  const acessoPrim = !isMissing(loopP) ? `ssh ${loopP}` : '—';
  const acessoSec = !isMissing(loopB) ? `ssh ${loopB}` : '—';
  const pingPrim = !isMissing(loopP) ? `ping ${loopP} df-bit size 1472 source Gi0/0/1.1090 repeat 10` : '—';
  const pingSec = !isMissing(loopB) ? `ping ${loopB} df-bit size 1300 source Gi0/0/1.1090 repeat 10` : '—';
  const tempoPrim = !isMissing(loopP) ? `sh ip route | inc ${loopP}/32` : '—';
  const tempoSec = !isMissing(loopB) ? `sh ip route | inc ${loopB}/32` : '—';
  const acessoNat = !isMissing(ipNat) ? `ssh SEU_USUARIO@${ipNat}` : '—';

  const scriptLines = [];
  if(!isMissing(loopP) || !isMissing(loopB)){
    scriptLines.push('tclsh', '', 'foreach add {');
    if(!isMissing(loopP)){
      scriptLines.push(`"${loopP} df-bit size 1472 source Gi0/0/1.1090 repeat 5"`);
    }
    if(!isMissing(loopB)){
      scriptLines.push(`"${loopB} df-bit size 1472 source Gi0/0/1.1090 repeat 5"`);
    }
    scriptLines.push('} { ping $add }');
  }
  const scriptText = scriptLines.length ? scriptLines.join('\n') : '—';

  const cmdList = [
    ['ACESSO PRIMARIO', acessoPrim],
    ['ACESSO SECUNDARIO', acessoSec],
    ['PING PRIMARIO', pingPrim],
    ['TEMPO ROTEAMENTO PRIMARIO', tempoPrim],
    ['PING SECUNDARIO', pingSec],
    ['TEMPO ROTEAMENTO SECUNDARIO', tempoSec],
    ['ACESSO VIA NAT', acessoNat],
    ['SCRIPT TCLSH', scriptText],
  ];

  for(const [label,text] of cmdList){
    const c=el('div','cmd');
    const row=el('div','row');
    const lab=el('div');
    lab.textContent=label;
    const b=el('button','ghost');
    b.textContent='Copiar';
    b.addEventListener('click', async ()=>{
      try{ await navigator.clipboard.writeText(text); b.textContent='Copiado'; setTimeout(()=>b.textContent='Copiar',900);}catch{ /* ignore */ }
    });
    row.appendChild(lab); row.appendChild(b);
    const pre=el('div');
    pre.textContent=text;
    c.appendChild(row); c.appendChild(pre);
    cmds.appendChild(c);
  }
}

function prefillEncQuedaFromRecord(){
  if(!CURRENT) return;
  if($('#encQueda').value) return;
  const raw = pickField(CURRENT, ['data_hora_queda','DATA E HORA DA QUEDA','DATA/HORA QUEDA']);
  const parsed = parseDatePt(raw);
  if(parsed){
    $('#encQueda').value = formatDateTimeSeconds(parsed);
  } else if(raw) {
    $('#encQueda').value = raw;
  }
}

function selectRecord(code, opts = {}){
  if(!INDEX || !INDEX.mapByCodUl.has(code)) return;
  const r = INDEX.mapByCodUl.get(code);
  CURRENT = r;
  renderConsulta(r);
  setMaskWarning();
  prefillEncQuedaFromRecord();
  if(MASK_SUBTAB === 'abertura') refreshAbertura();
  if(MASK_SUBTAB === 'encerramento') refreshEncerramentoMinimal();
  const feedback = opts.feedback || `Registro selecionado: <code>${code}</code>`;
  $('#results').innerHTML = `<div class="hint">${feedback}</div>`;
  activateTab('consulta');
}

function tryAutoSelectFromQuery(query){
  if(!INDEX || !query || !isLikelyCodUl(query)) return false;
  const candidates = buildCodUlCandidates(query);
  for(const code of candidates){
    if(INDEX.mapByCodUl.has(code)){
      const record = INDEX.mapByCodUl.get(code);
      const name = pickField(record, ['nome_loterica','NOME DA LOTERICA','NOME UL']);
      const safeCode = escapeHtml(code);
      const safeName = name ? ` - ${escapeHtml(name)}` : '';
      const message = `Loterica selecionada: <code>${safeCode}</code>${safeName}`;
      selectRecord(code, {feedback: message});
      return true;
    }
  }
  return false;
}

function updateSuggestions(){
  if(!INDEX) return;
  const q = $('#q').value;
  const list = getSuggestions(INDEX, q, 8);
  const dl = $('#suggestions');
  dl.innerHTML = '';
  for(const item of list){
    const opt = document.createElement('option');
    opt.value = item.value;
    opt.label = item.label;
    dl.appendChild(opt);
  }
}

async function loadFromIndexedDB(){
  CURRENT = null;
  const records = await getAllRecords(DB);
  const importInfo = await getMeta(DB, META_IMPORT);
  const customCauses = await getMeta(DB, META_CUSTOM_CAUSES);
  const aberturaState = await getMeta(DB, META_ABERTURA_STATE);
  const encerramentoState = await getMeta(DB, META_ENCERRAMENTO_STATE);
  if(Array.isArray(customCauses)){
    CUSTOM_CAUSES = customCauses;
  } else {
    const raw = localStorage.getItem(STORAGE_CUSTOM_CAUSES);
    try{
      CUSTOM_CAUSES = raw ? JSON.parse(raw) : [];
    } catch {
      CUSTOM_CAUSES = [];
    }
  }

  if(records.length === 0){
    INDEX = null;
    setSearchEnabled(false);
    setResultsHint('Importe o XLSX para comecar.');
  } else {
    INDEX = buildSearchIndex(records);
    setSearchEnabled(true);
    setResultsHint(`Base carregada: ${records.length.toLocaleString('pt-BR')} registros.`);
  }

  populateEncerramentoOptions();
  populateAberturaDefeitos();
  populateAberturaTiposSelect();
  if(aberturaState){
    applyAberturaState(aberturaState);
  } else {
    const tipo = localStorage.getItem(STORAGE_ABERTURA_TIPO);
    const defect = localStorage.getItem(STORAGE_ABERTURA_DEFECT);
    const reclamacao = localStorage.getItem(STORAGE_ABERTURA_RECLAMACAO);
    const edited = localStorage.getItem(STORAGE_ABERTURA_EDITED) === '1';
    if(tipo || defect || reclamacao) applyAberturaState({tipo, defeito: defect, reclamacao, edited});
  }
  if(encerramentoState){
    applyEncerramentoState(encerramentoState);
  } else {
    applyEncerramentoState({
      falha: localStorage.getItem(STORAGE_ENC_FAIL),
      causa: localStorage.getItem(STORAGE_ENC_CAUSE),
      contatoNome: localStorage.getItem(STORAGE_ENC_CONTACT_NAME),
      contatoTel: localStorage.getItem(STORAGE_ENC_CONTACT_PHONE),
      auto: localStorage.getItem(STORAGE_ENC_AUTO) === '1',
      tempo: localStorage.getItem(STORAGE_ENC_TEMPO),
      queda: localStorage.getItem(STORAGE_ENC_QUEDA),
      normalizacao: localStorage.getItem(STORAGE_ENC_NORM),
    });
  }
  if(!$('#abReclamacao').value) ensureAberturaReclamacaoDefault(true);
  setMaskSubtab(MASK_SUBTAB);
  renderConsulta(null);

  ['#kv-loterica','#kv-principal','#kv-backup','#cmds'].forEach(sel=>$(sel).innerHTML='');
  setMaskText('');

  if(importInfo){
    setStatus('#importStatus', buildImportReportLines(importInfo));
  } else {
    setStatus('#importStatus', ['Nenhuma base importada.']);
  }
  updateLastUpdateLabel(importInfo);
}

async function wireUI(){
  $('#btnBuscar').addEventListener('click', ()=>{
    if(!INDEX){
      activateTab('importar');
      setResultsHint('Importe o XLSX para comecar.');
      return;
    }
    const rawQuery = $('#q').value;
    const normalizedQuery = normalizeQuery(rawQuery);
    localStorage.setItem(STORAGE_LAST_QUERY, rawQuery);
    if(tryAutoSelectFromQuery(normalizedQuery)) return;
    renderResults(searchRecords(INDEX, normalizedQuery));
  });
  $('#q').addEventListener('input', updateSuggestions);
  $('#q').addEventListener('keydown', (e)=>{
    if(e.key==='Enter') $('#btnBuscar').click();
  });
  $('#btnLimpar').addEventListener('click', ()=>{
    $('#q').value='';
    $('#results').innerHTML='';
    CURRENT=null;
    ['#kv-loterica','#kv-principal','#kv-backup','#cmds'].forEach(sel=>$(sel).innerHTML='');
    setMaskText('');
    setMaskWarning();
    if(MASK_SUBTAB === 'abertura') refreshAbertura();
    if(MASK_SUBTAB === 'encerramento') refreshEncerramentoMinimal();
    renderConsulta(null);
  });

  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click', ()=>activateTab(b.dataset.tab)));

  document.querySelectorAll('.subtab').forEach(b=>b.addEventListener('click', ()=>setMaskSubtab(b.dataset.subtab)));


  $('#aberturaTipoSelect').addEventListener('change', ()=>{
    localStorage.setItem(STORAGE_ABERTURA_TIPO, $('#aberturaTipoSelect').value || 'oemp_oi');
    refreshAbertura();
  });

  $('#abDefeito').addEventListener('change', ()=>{
    if(!ABERTURA_EDITED) ensureAberturaReclamacaoDefault(true);
    refreshAbertura();
  });
  $('#abReclamacao').addEventListener('input', ()=>{
    ABERTURA_EDITED = true;
    refreshAbertura();
  });
  $('#btnRestaurarReclamacao').addEventListener('click', ()=>{
    ensureAberturaReclamacaoDefault(true);
    refreshAbertura();
  });

  $('#btnAddCausa').addEventListener('click', async ()=>{
    const val = window.prompt('Digite a nova causa/solucao:');
    if(!val) return;
    const trimmed = val.trim();
    if(!trimmed) return;
    CUSTOM_CAUSES = uniqueList([...(CUSTOM_CAUSES || []), trimmed]);
    await setMeta(DB, META_CUSTOM_CAUSES, CUSTOM_CAUSES);
    localStorage.setItem(STORAGE_CUSTOM_CAUSES, JSON.stringify(CUSTOM_CAUSES));
    populateEncerramentoOptions();
    $('#encCausa').value = trimmed;
    refreshEncerramentoMinimal();
  });

  $('#btnLastContato').addEventListener('click', ()=>{
    const lastName = localStorage.getItem(STORAGE_ENC_CONTACT_NAME) || '';
    const lastTel = localStorage.getItem(STORAGE_ENC_CONTACT_PHONE) || '';
    $('#encContatoNome').value = lastName;
    $('#encContatoTel').value = lastTel;
    refreshEncerramentoMinimal();
  });

  $('#encFalha').addEventListener('change', refreshEncerramentoMinimal);
  $('#encCausa').addEventListener('change', refreshEncerramentoMinimal);
  $('#encContatoNome').addEventListener('input', refreshEncerramentoMinimal);
  $('#encContatoTel').addEventListener('input', refreshEncerramentoMinimal);
  $('#encAuto').addEventListener('change', refreshEncerramentoMinimal);
  $('#encTempo').addEventListener('input', refreshEncerramentoMinimal);
  $('#encQueda').addEventListener('input', refreshEncerramentoMinimal);
  $('#encNormalizacao').addEventListener('input', refreshEncerramentoMinimal);

  $('#btnCopiarAbertura').addEventListener('click', async ()=>{
    const t = getMaskText();
    try{
      await navigator.clipboard.writeText(t);
      $('#abStatus').textContent='Copiado.';
      setTimeout(()=>$('#abStatus').textContent='',1200);
    } catch {
      $('#abStatus').textContent='Nao foi possivel copiar automaticamente.';
    }
  });

  $('#btnDownloadAbertura').addEventListener('click', ()=>{
    const text = getMaskText();
    if(!text) return;
    const now = new Date();
    const pad = (x)=> String(x).padStart(2,'0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const code = CURRENT ? (getRecordCode(CURRENT) || 'sem_codigo') : 'sem_codigo';
    const typeId = $('#aberturaTipoSelect').value || 'tipo';
    const filename = `abertura_${typeId}_${code}.txt`;
    const blob = new Blob([text], {type:'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  });

  $('#btnLimparAbertura').addEventListener('click', ()=>{
    ABERTURA_EDITED = false;
    populateAberturaTiposSelect();
    populateAberturaDefeitos();
    ensureAberturaReclamacaoDefault(true);
    refreshAbertura();
  });

  $('#btnCopiarEncerramento').addEventListener('click', async ()=>{
    const t = getMaskText();
    try{
      await navigator.clipboard.writeText(t);
      $('#encStatus').textContent='Copiado.';
      setTimeout(()=>$('#encStatus').textContent='',1200);
    } catch {
      $('#encStatus').textContent='Nao foi possivel copiar automaticamente.';
    }
  });

  $('#btnDownloadEncerramento').addEventListener('click', ()=>{
    const text = getMaskText();
    if(!text) return;
    const now = new Date();
    const pad = (x)=> String(x).padStart(2,'0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const code = CURRENT ? (getRecordCode(CURRENT) || 'sem_codigo') : 'sem_codigo';
    const filename = `encerramento_${code}_${stamp}.txt`;
    const blob = new Blob([text], {type:'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  });

  $('#btnLimparEncerramento').addEventListener('click', ()=>{
    $('#encFalha').value = '';
    $('#encCausa').value = '';
    $('#encContatoNome').value = '';
    $('#encContatoTel').value = '';
    $('#encAuto').checked = false;
    $('#encTempo').value = '';
    $('#encQueda').value = '';
    $('#encNormalizacao').value = '';
    refreshEncerramentoMinimal();
  });

  $('#btnImportXlsx').addEventListener('click', async ()=>{
    const file = $('#xlsxFile').files && $('#xlsxFile').files[0];
    if(!file){
      setStatus('#importStatus', ['Selecione um arquivo XLSX para importar.']);
      return;
    }
    setStatus('#importStatus', ['Lendo arquivo...']);
    try{
      const prevCode = CURRENT ? getRecordCode(CURRENT) : null;
      const {records, report} = await importXlsxFile(file);
      report.source = 'upload';
      setStatus('#importStatus', ['Salvando...']);
      await clearRecords(DB);
      await putManyRecords(DB, records);
      await setMeta(DB, META_IMPORT, report);
      await applyPostImport(prevCode);

      setStatus('#importStatus', buildImportReportLines(report));
      setAutoLoadWarning('');
      updateLastUpdateLabel(report);
    } catch (err){
      console.error(err);
      setStatus('#importStatus', ['Erro ao importar o XLSX. Verifique o arquivo.']);
    }
  });

  $('#btnUpdateFromSite').addEventListener('click', async ()=>{
    const {error, url, display} = resolveSameOriginUrl($('#xlsxUrl').value);
    if(error){
      setStatus('#importStatus', [error]);
      return;
    }
    setStatus('#importStatus', ['Baixando XLSX...']);
    try{
      const res = await fetch(url, {cache:'no-store'});
      if(!res.ok){
        if(res.status === 404){
          setStatus('#importStatus', ['Arquivo base.xlsx nao encontrado na raiz do site. Publique o arquivo no repositorio.']);
        } else {
          setStatus('#importStatus', [`Falha ao baixar XLSX (HTTP ${res.status}).`]);
        }
        return;
      }
      const buffer = await res.arrayBuffer();
      const prevCode = CURRENT ? getRecordCode(CURRENT) : null;
      const {records, report} = importXlsxArrayBuffer(buffer, display);
      report.source = 'site';
      report.importedAt = new Date().toISOString();
      setStatus('#importStatus', ['Salvando...']);
      await clearRecords(DB);
      await putManyRecords(DB, records);
      await setMeta(DB, META_IMPORT, report);
      await applyPostImport(prevCode);
      setStatus('#importStatus', buildImportReportLines(report));
      setAutoLoadWarning('');
      updateLastUpdateLabel(report);
    } catch (err){
      console.error(err);
      setStatus('#importStatus', ['Erro ao baixar ou importar o XLSX do site.']);
    }
  });

  $('#btnAutoLoadBase').addEventListener('click', async ()=>{
    await autoLoadBaseXlsx();
  });

  $('#btnClearDb').addEventListener('click', async ()=>{
    await clearRecords(DB);
    await clearMeta(DB);
    INDEX = null;
    CURRENT = null;
    setSearchEnabled(false);
    setResultsHint('Base local apagada. Importe novamente.');
    setStatus('#importStatus', ['Base local apagada.']);
    setAutoLoadWarning('');
    updateLastUpdateLabel(null);
  });

  $('#btnExportJson').addEventListener('click', async ()=>{
    const payload = await exportDBAsJson(DB);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lotericas-base.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  });

  $('#btnImportJson').addEventListener('click', async ()=>{
    const file = $('#jsonFile').files && $('#jsonFile').files[0];
    if(!file){
      setStatus('#importStatus', ['Selecione um arquivo JSON para importar.']);
      return;
    }
    try{
      const text = await file.text();
      const payload = JSON.parse(text);
      await importDbJson(DB, payload);
      await loadFromIndexedDB();
      setStatus('#importStatus', ['JSON importado com sucesso.']);
    } catch (err){
      console.error(err);
      setStatus('#importStatus', ['Falha ao importar JSON.']);
    }
  });

  $('#btnFillSelected').addEventListener('click', ()=>{
    if(!CURRENT){
      setStatus('#ulStatus', ['Selecione um registro na aba Consulta para preencher.']);
      return;
    }
    const code = getRecordCode(CURRENT);
    $('#ulCode').value = code || '';
    $('#ulJson').value = JSON.stringify(CURRENT, null, 2);
    setStatus('#ulStatus', ['Registro selecionado carregado para edicao.']);
  });

  $('#btnApplyUl').addEventListener('click', async ()=>{
    let record;
    try{
      record = JSON.parse($('#ulJson').value);
    } catch {
      setStatus('#ulStatus', ['JSON invalido. Corrija o conteudo e tente novamente.']);
      return;
    }
    const code = $('#ulCode').value.trim() || getRecordCode(record);
    if(!code){
      setStatus('#ulStatus', ['Informe o codigo UL ou garanta que o JSON contenha o campo cod_ul.']);
      return;
    }
    record.cod_ul = code;
    await putRecord(DB, record);
    await loadFromIndexedDB();
    CURRENT = record;
    renderConsulta(record);
    prefillEncQuedaFromRecord();
    if(MASK_SUBTAB === 'abertura') refreshAbertura();
    if(MASK_SUBTAB === 'encerramento') refreshEncerramentoMinimal();
    setStatus('#ulStatus', [`Registro ${code} salvo.`]);
  });

  $('#btnDeleteUl').addEventListener('click', async ()=>{
    const code = $('#ulCode').value.trim();
    if(!code){
      setStatus('#ulStatus', ['Informe o codigo UL para excluir.']);
      return;
    }
    await deleteRecord(DB, code);
    await loadFromIndexedDB();
    if(CURRENT && getRecordCode(CURRENT) === code){
      CURRENT = null;
      ['#kv-loterica','#kv-principal','#kv-backup','#cmds'].forEach(sel=>$(sel).innerHTML='');
      setMaskText('');
      renderConsulta(null);
    }
    setStatus('#ulStatus', [`Registro ${code} excluido.`]);
  });
}

document.addEventListener('DOMContentLoaded', async ()=>{
  DB = await openDB();
  await wireUI();
  const lastQ = localStorage.getItem(STORAGE_LAST_QUERY);
  if(lastQ) $('#q').value = lastQ;
  const existingRecords = await getAllRecords(DB);
  if(existingRecords.length === 0){
    const loaded = await autoLoadBaseXlsx();
    if(!loaded){
      await loadFromIndexedDB();
    }
  } else {
    await loadFromIndexedDB();
  }
});
