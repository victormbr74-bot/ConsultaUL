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

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls) => { const n=document.createElement(tag); if(cls) n.className=cls; return n; };

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

function setResultsHint(text){
  $('#results').innerHTML = `<div class="hint">${text}</div>`;
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
  if(tab === 'abertura') refreshAberturaMinimal();
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
  const auto = getAberturaAutoFields(CURRENT);
  return {
    ...auto,
    defeito_reclamado: $('#abDefeito').value || '',
    reclamacao_inicial: $('#abReclamacao').value || '',
  };
}

function saveAberturaState(){
  const state = {
    defeito: $('#abDefeito').value || '',
    reclamacao: $('#abReclamacao').value || '',
    edited: ABERTURA_EDITED,
  };
  localStorage.setItem(STORAGE_ABERTURA_DEFECT, state.defeito);
  localStorage.setItem(STORAGE_ABERTURA_RECLAMACAO, state.reclamacao);
  localStorage.setItem(STORAGE_ABERTURA_EDITED, state.edited ? '1' : '0');
  setMeta(DB, META_ABERTURA_STATE, state);
}

function applyAberturaState(state){
  if(!state) return;
  if(state.defeito) $('#abDefeito').value = state.defeito;
  if(state.reclamacao) $('#abReclamacao').value = state.reclamacao;
  ABERTURA_EDITED = !!state.edited;
}

function refreshAberturaMinimal(){
  if(!$('#abDefeito').value) populateAberturaDefeitos();
  const payload = getAberturaPayload();
  $('#maskText').value = buildAberturaMinimalText(payload);
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
  $('#maskText').value = buildEncerramentoText(payload);
  saveEncerramentoState();
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
    const ccto = pickField(r, ['ccto_oi','ccto_oemp','CCTO OI','BASE UN','CCTO OEMP','CIRCUITO OEMP']);

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
    ['Codigo UL', val('codigo_ul')],
    ['Nome', val('nome_ul')],
    ['Status', val('status')],
    ['UF', val('uf')],
    ['Contato', val('contato')],
    ['Endereco', val('endereco')],
    ['Homologado', val('homolo')],
    ['Migracao', val('migracao')],
    ['Meraki', val('meraki')],
    ['Owner', val('owner')],
    ['Tipo', val('tipo_ul')],
    ['TFL', val('tfl')],
  ]);

  putKV('#kv-principal', [
    ['Designacao/CCTO', val('designacao_atual_antiga')],
    ['IP NAT', ipNat],
    ['IP WAN', val('ip_wan')],
    ['Loopback WAN', loopP],
    ['Loopback switch', val('loopback_switch')],
  ]);

  putKV('#kv-backup', [
    ['Empresa OEMP', val('empresa_oemp')],
    ['Circuito/CCTO OEMP', val('circuito_oemp')],
    ['Loopback backup', loopB],
    ['Operadora backup', val('operadora_4g')],
    ['Responsavel backup', val('responsavel_backup')],
  ]);

  const cmds = $('#cmds');
  cmds.innerHTML='';
  const cmdList=[];
  if(loopP && loopP !== '—') cmdList.push(['SSH principal', `ssh ${loopP}`]);
  if(loopB && loopB !== '—') cmdList.push(['SSH backup', `ssh ${loopB}`]);
  if(loopP && loopP !== '—') cmdList.push(['Ping principal (MTU)', `ping ${loopP} df-bit size 1472 source Gi0/0/1.1090 repeat 10`]);
  if(loopB && loopB !== '—') cmdList.push(['Ping backup', `ping ${loopB} df-bit size 1300 source Gi0/0/1.1090 repeat 10`]);
  if(ipNat && ipNat !== '—') cmdList.push(['Acesso via NAT', `ssh SEU_USUARIO@${ipNat}`]);

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

function selectRecord(code){
  if(!INDEX || !INDEX.mapByCodUl.has(code)) return;
  const r = INDEX.mapByCodUl.get(code);
  CURRENT = r;
  renderConsulta(r);
  setMaskWarning();
  prefillEncQuedaFromRecord();
  if(MASK_SUBTAB === 'abertura') refreshAberturaMinimal();
  if(MASK_SUBTAB === 'encerramento') refreshEncerramentoMinimal();
  $('#results').innerHTML = `<div class="hint">Registro selecionado: <code>${code}</code></div>`;
  activateTab('consulta');
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
  if(aberturaState){
    applyAberturaState(aberturaState);
  } else {
    const defect = localStorage.getItem(STORAGE_ABERTURA_DEFECT);
    const reclamacao = localStorage.getItem(STORAGE_ABERTURA_RECLAMACAO);
    const edited = localStorage.getItem(STORAGE_ABERTURA_EDITED) === '1';
    if(defect || reclamacao) applyAberturaState({defeito: defect, reclamacao, edited});
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
  $('#maskText').value = '';

  if(importInfo){
    const lines = [
      `Arquivo: ${importInfo.fileName}`,
      `Importado em: ${importInfo.importedAt}`,
      `Abas: ${importInfo.sheetsFound.join(', ') || '-'}`,
      `Registros: ${importInfo.validRecords}`,
      `Ignorados: ${importInfo.ignored}`,
      `Conflitos: ${importInfo.conflicts}`,
    ];
    setStatus('#importStatus', lines);
  } else {
    setStatus('#importStatus', ['Nenhuma base importada.']);
  }
}

async function wireUI(){
  $('#btnBuscar').addEventListener('click', ()=>{
    if(!INDEX){
      activateTab('importar');
      setResultsHint('Importe o XLSX para comecar.');
      return;
    }
    const q=$('#q').value;
    localStorage.setItem(STORAGE_LAST_QUERY, q);
    renderResults(searchRecords(INDEX, q));
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
    $('#maskText').value='';
    setMaskWarning();
    if(MASK_SUBTAB === 'abertura') refreshAberturaMinimal();
    if(MASK_SUBTAB === 'encerramento') refreshEncerramentoMinimal();
    renderConsulta(null);
  });

  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click', ()=>activateTab(b.dataset.tab)));

  document.querySelectorAll('.subtab').forEach(b=>b.addEventListener('click', ()=>setMaskSubtab(b.dataset.subtab)));


  $('#abDefeito').addEventListener('change', ()=>{
    if(!ABERTURA_EDITED) ensureAberturaReclamacaoDefault(true);
    refreshAberturaMinimal();
  });
  $('#abReclamacao').addEventListener('input', ()=>{
    ABERTURA_EDITED = true;
    refreshAberturaMinimal();
  });
  $('#btnRestaurarReclamacao').addEventListener('click', ()=>{
    ensureAberturaReclamacaoDefault(true);
    refreshAberturaMinimal();
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
    const t = $('#maskText').value;
    try{
      await navigator.clipboard.writeText(t);
      $('#abStatus').textContent='Copiado.';
      setTimeout(()=>$('#abStatus').textContent='',1200);
    } catch {
      $('#abStatus').textContent='Nao foi possivel copiar automaticamente.';
    }
  });

  $('#btnDownloadAbertura').addEventListener('click', ()=>{
    const text = $('#maskText').value;
    if(!text) return;
    const now = new Date();
    const pad = (x)=> String(x).padStart(2,'0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const code = CURRENT ? (getRecordCode(CURRENT) || 'sem_codigo') : 'sem_codigo';
    const filename = `abertura_${code}_${stamp}.txt`;
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
    populateAberturaDefeitos();
    ensureAberturaReclamacaoDefault(true);
    refreshAberturaMinimal();
  });

  $('#btnCopiarEncerramento').addEventListener('click', async ()=>{
    const t = $('#maskText').value;
    try{
      await navigator.clipboard.writeText(t);
      $('#encStatus').textContent='Copiado.';
      setTimeout(()=>$('#encStatus').textContent='',1200);
    } catch {
      $('#encStatus').textContent='Nao foi possivel copiar automaticamente.';
    }
  });

  $('#btnDownloadEncerramento').addEventListener('click', ()=>{
    const text = $('#maskText').value;
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
      const {records, report} = await importXlsxFile(file);
      setStatus('#importStatus', ['Salvando...']);
      await clearRecords(DB);
      await putManyRecords(DB, records);
      await setMeta(DB, META_IMPORT, report);
      await loadFromIndexedDB();

      const lines = [
        `Total de linhas: ${report.totalLines}`,
        `Registros validos: ${report.validRecords}`,
        `Ignorados (sem cod_ul): ${report.ignored}`,
        `Aba principal: ${report.primarySheet || '-'}`,
        `Abas encontradas: ${report.sheetsFound.join(', ') || '-'}`,
        `Campos finais: ${report.fields.join(', ') || '-'}`,
        `Conflitos: ${report.conflicts}`,
      ];
      setStatus('#importStatus', lines);
    } catch (err){
      console.error(err);
      setStatus('#importStatus', ['Erro ao importar o XLSX. Verifique o arquivo.']);
    }
  });

  $('#btnClearDb').addEventListener('click', async ()=>{
    await clearRecords(DB);
    await clearMeta(DB);
    INDEX = null;
    CURRENT = null;
    setSearchEnabled(false);
    setResultsHint('Base local apagada. Importe novamente.');
    setStatus('#importStatus', ['Base local apagada.']);
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
    if(MASK_SUBTAB === 'abertura') refreshAberturaMinimal();
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
      $('#maskText').value='';
      renderConsulta(null);
    }
    setStatus('#ulStatus', [`Registro ${code} excluido.`]);
  });
}

(async function main(){
  DB = await openDB();
  await wireUI();
  const lastQ = localStorage.getItem(STORAGE_LAST_QUERY);
  if(lastQ) $('#q').value = lastQ;
  await loadFromIndexedDB();
})();
