/*
  Static app: XLSX import -> IndexedDB -> search/masks
*/

let DB = null;
let INDEX = null;
let CURRENT = null;
let TEMPLATES = [];
let CUSTOM_CAUSES = [];
let ABERTURA_EDITED = false;

const VIEWS = ['consulta','mascara','importar','loterica'];
const META_IMPORT = 'import_info';
const META_TEMPLATES = 'templates';

const STORAGE_LAST_QUERY = 'last_query';
const STORAGE_LAST_TEMPLATE = 'last_template';
const STORAGE_LAST_OBS = 'last_obs';
const STORAGE_LAST_FAIL = 'last_fail';
const STORAGE_LAST_CAUSE = 'last_cause';
const STORAGE_LAST_CONTACT_NAME = 'last_contact_name';
const STORAGE_LAST_CONTACT_PHONE = 'last_contact_phone';
const STORAGE_ABERTURA_LAST = 'abertura_last';
const META_CUSTOM_CAUSES = 'custom_causes';
const META_ABERTURA_LAST = 'abertura_padrao_last';

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

  const lastFail = localStorage.getItem(STORAGE_LAST_FAIL);
  if(lastFail && Array.from(falhaSel.options).some(o=>o.value===lastFail)) falhaSel.value = lastFail;
  const lastCause = localStorage.getItem(STORAGE_LAST_CAUSE);
  if(lastCause && Array.from(causaSel.options).some(o=>o.value===lastCause)) causaSel.value = lastCause;
}

function getEncerramentoPayload(){
  const falha = $('#encFalha').value || '';
  const dataHora = parseEncerramentoDate($('#encDataHora').value, $('#encSegundos').value);
  const causa = $('#encCausa').value || '';
  const contatoNome = $('#encContatoNome').value || '';
  const contatoTel = $('#encContatoTel').value || '';
  return {falha, dataHora, causa, contatoNome, contatoTel};
}

function refreshEncerramento(){
  const payload = getEncerramentoPayload();
  $('#maskText').value = buildEncerramentoText(payload);
  localStorage.setItem(STORAGE_LAST_FAIL, payload.falha);
  localStorage.setItem(STORAGE_LAST_CAUSE, payload.causa);
  localStorage.setItem(STORAGE_LAST_CONTACT_NAME, payload.contatoNome);
  localStorage.setItem(STORAGE_LAST_CONTACT_PHONE, payload.contatoTel);
}

function setEncerramentoVisible(visible){
  $('#encerramentoForm').classList.toggle('hidden', !visible);
  if(visible) refreshEncerramento();
}

function setAberturaVisible(visible){
  $('#aberturaPadraoForm').classList.toggle('hidden', !visible);
  if(visible){
    prefillAberturaFromRecord(CURRENT);
    if(!$('#abReclamacao').value){
      ABERTURA_EDITED = false;
      ensureAberturaReclamacaoDefault(true);
    }
    refreshAbertura();
  }
}

function getAberturaPayload(){
  return {
    designacao: $('#abDesignacao').value || '',
    cod_ul: $('#abCodUl').value || '',
    cliente: $('#abCliente').value || '',
    protocolo_oi: $('#abProtocoloOi').value || '',
    tipo_solicitacao: $('#abTipoSolic').value || '',
    provedor: $('#abProvedor').value || '',
    reincidente: $('#abReincidente').value || '',
    ja_escalonado: $('#abEscalonado').value || '',
    data_hora_queda: formatAberturaDate($('#abDataHoraQueda').value),
    realizado_ts: $('#abTsCliente').value || '',
    defeito_reclamado: $('#abDefeito').value || '',
    horario_funcionamento: $('#abHorarioFunc').value || '',
    contato_local: $('#abContatoLocal').value || '',
    contato_validacao: $('#abContatoValidacao').value || '',
    reclamacao_inicial: $('#abReclamacao').value || '',
  };
}

function saveAberturaState(payload){
  localStorage.setItem(STORAGE_ABERTURA_LAST, JSON.stringify(payload));
  setMeta(DB, META_ABERTURA_LAST, payload);
}

function loadAberturaState(){
  const raw = localStorage.getItem(STORAGE_ABERTURA_LAST);
  if(raw){
    try{ return JSON.parse(raw); } catch { return null; }
  }
  return null;
}

function applyAberturaState(state){
  if(!state) return;
  $('#abDesignacao').value = state.designacao || '';
  $('#abCodUl').value = state.cod_ul || '';
  $('#abCliente').value = state.cliente || '';
  $('#abProtocoloOi').value = state.protocolo_oi || '';
  $('#abTipoSolic').value = state.tipo_solicitacao || 'ABERTURA';
  $('#abProvedor').value = state.provedor || '';
  $('#abReincidente').value = state.reincidente || 'NAO';
  $('#abEscalonado').value = state.ja_escalonado || '';
  $('#abDataHoraQueda').value = state.data_hora_queda_raw || '';
  $('#abTsCliente').value = state.realizado_ts || 'NAO';
  $('#abDefeito').value = state.defeito_reclamado || '';
  $('#abHorarioFunc').value = state.horario_funcionamento || '';
  $('#abContatoLocal').value = state.contato_local || '';
  $('#abContatoValidacao').value = state.contato_validacao || '';
  $('#abReclamacao').value = state.reclamacao_inicial || '';
  const padrao = getReclamacaoPadrao($('#abDefeito').value);
  ABERTURA_EDITED = !!($('#abReclamacao').value && $('#abReclamacao').value !== padrao);
}

function refreshAbertura(){
  const payload = getAberturaPayload();
  $('#maskText').value = buildAberturaPadraoText(payload);
  saveAberturaState({
    ...payload,
    data_hora_queda_raw: $('#abDataHoraQueda').value || '',
  });
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

function prefillAberturaFromRecord(record){
  if(!record) return;
  const setIfEmpty = (sel, val)=>{
    const node = $(sel);
    if(node && !node.value && val) node.value = val;
  };
  const designacao = pickField(record, ['designacao','ccto_oi','CCTO OI','BASE UN','Ponto Logico / Designacao','Ponto Lógico / \nDesignação']);
  const codUl = getRecordCode(record);
  const cliente = pickField(record, ['cliente','razao_social','nome_loterica','NOME DA LOTERICA','NOME UL','empresa_oemp','EMPRESA OEMP']);
  const provedor = pickField(record, ['provedor','operadora','OPERADORA','OPERADORA BACKUP','EMPRESA OEMP']);
  const contato = pickField(record, ['contato','CONTATO']);
  setIfEmpty('#abDesignacao', designacao);
  setIfEmpty('#abCodUl', codUl);
  setIfEmpty('#abCliente', cliente);
  setIfEmpty('#abProvedor', provedor);
  setIfEmpty('#abContatoLocal', contato);
  setIfEmpty('#abContatoValidacao', contato);
  if(!$('#abDataHoraQueda').value){
    const now = new Date();
    const pad = (x)=> String(x).padStart(2,'0');
    $('#abDataHoraQueda').value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
  if(!$('#abTipoSolic').value) $('#abTipoSolic').value = 'ABERTURA';
  refreshAbertura();
}

function resetEncerramentoForm(){
  $('#encFalha').value = '';
  $('#encDataHora').value = '';
  $('#encSegundos').value = '';
  $('#encCausa').value = '';
  $('#encContatoNome').value = '';
  $('#encContatoTel').value = '';
  ['#maskText'].forEach(sel=>$(sel).value='');
  localStorage.removeItem(STORAGE_LAST_FAIL);
  localStorage.removeItem(STORAGE_LAST_CAUSE);
  localStorage.removeItem(STORAGE_LAST_CONTACT_NAME);
  localStorage.removeItem(STORAGE_LAST_CONTACT_PHONE);
}

function activateTab(tab){
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  for(const v of VIEWS){
    const view = document.querySelector(`#view-${v}`);
    if(view) view.classList.toggle('hidden', v!==tab);
  }
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
  if(!r) return;
  const code = getRecordCode(r);
  const nome = pickField(r, ['nome_loterica','NOME DA LOTERICA','NOME UL']);
  const endereco = pickField(r, ['endereco','ENDERECO','ENDERECO UL']);
  const uf = pickField(r, ['uf','UF']);
  const contato = pickField(r, ['contato','CONTATO']);
  const status = pickField(r, ['status','STATUS','STATUS UL']);
  const homolog = pickField(r, ['homologado','HOMOLOGADO']);
  const migr = pickField(r, ['migracao','MIGRACAO','MIGRACAO']);
  const owner = pickField(r, ['owner','OWNER']);
  const tipo = pickField(r, ['tipo_ul','tipo_loterica','TIPO UL','TIPO LOTERICA']);
  const tfl = pickField(r, ['tfl','tfls','TFL','TFLS']);

  const cctoOi = pickField(r, ['ccto_oi','CCTO OI','BASE UN']);
  const ipNat = pickField(r, ['ip_nat','IP NAT','IP de NAT']);
  const ipWan = pickField(r, ['ip_wan','IP WAN']);
  const loopWan = pickField(r, ['loopback_wan','LOOPBACK PRINCIPAL','LOOPBACK PRIMARIO']);
  const loopSw = pickField(r, ['loopback_lan','LOOPBACK SWITCH']);

  const empOemp = pickField(r, ['empresa_oemp','EMPRESA OEMP']);
  const cctoOemp = pickField(r, ['ccto_oemp','CCTO OEMP','CIRCUITO OEMP']);
  const loopBackup = pickField(r, ['loopback_backup','loopback_lan','LOOPBACK SECUNDARIO','LOOPBACK BACKUP']);
  const oper = pickField(r, ['operadora','OPERADORA','OPERADORA BACKUP']);
  const respBackup = pickField(r, ['resp_backup','RESP BACKUP']);

  const putKV = (target, entries) => {
    const box = $(target);
    box.innerHTML='';
    for(const [k,v] of entries){
      const kk=el('div','k'); kk.textContent=k;
      const vv=el('div','v'); vv.textContent=v || '-';
      box.appendChild(kk); box.appendChild(vv);
    }
  };

  putKV('#kv-loterica', [
    ['Codigo UL', code],
    ['Nome', nome],
    ['Status', status],
    ['UF', uf],
    ['Contato', contato],
    ['Endereco', endereco],
    ['Homologado', homolog],
    ['Migracao', migr],
    ['Owner', owner],
    ['Tipo', tipo],
    ['TFL', tfl],
  ]);

  putKV('#kv-principal', [
    ['Designacao/CCTO', cctoOi],
    ['IP NAT', ipNat],
    ['IP WAN', ipWan],
    ['Loopback WAN', loopWan],
    ['Loopback switch', loopSw],
  ]);

  putKV('#kv-backup', [
    ['Empresa OEMP', empOemp],
    ['Circuito/CCTO OEMP', cctoOemp],
    ['Loopback backup', loopBackup],
    ['Operadora backup', oper],
    ['Responsavel backup', respBackup],
  ]);

  const cmds = $('#cmds');
  cmds.innerHTML='';
  const cmdList=[];
  if(loopWan) cmdList.push(['SSH principal', `ssh ${loopWan}`]);
  if(loopBackup && loopBackup !== '0') cmdList.push(['SSH backup', `ssh ${loopBackup}`]);
  if(loopWan) cmdList.push(['Ping principal (MTU)', `ping ${loopWan} df-bit size 1472 source Gi0/0/1.1090 repeat 10`]);
  if(loopBackup && loopBackup !== '0') cmdList.push(['Ping backup', `ping ${loopBackup} df-bit size 1300 source Gi0/0/1.1090 repeat 10`]);
  if(ipNat) cmdList.push(['Acesso via NAT', `ssh SEU_USUARIO@${ipNat}`]);

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

function buildMaskData(r){
  return {
    cod_ul: getRecordCode(r),
    nome_loterica: pickField(r, ['nome_loterica','NOME DA LOTERICA','NOME UL']),
    endereco: pickField(r, ['endereco','ENDERECO','ENDERECO UL']),
    cidade: pickField(r, ['cidade','CIDADE','MUNICIPIO']),
    uf: pickField(r, ['uf','UF']),
    operadora: pickField(r, ['operadora','OPERADORA','OPERADORA BACKUP']),
    ccto_oi: pickField(r, ['ccto_oi','CCTO OI','BASE UN']),
    ccto_oemp: pickField(r, ['ccto_oemp','CCTO OEMP','CIRCUITO OEMP']),
    ip_nat: pickField(r, ['ip_nat','IP NAT','IP de NAT']),
    loopback_wan: pickField(r, ['loopback_wan','LOOPBACK PRINCIPAL','LOOPBACK PRIMARIO']),
    loopback_lan: pickField(r, ['loopback_lan','LOOPBACK SWITCH','LOOPBACK SECUNDARIO']),
    status: pickField(r, ['status','STATUS','STATUS UL']),
  };
}

function refreshMask(){
  const tplId = $('#maskTemplate').value;
  if(tplId === 'encerramento'){
    setEncerramentoVisible(true);
    setAberturaVisible(false);
    $('#maskTemplateRow').classList.add('hidden');
    $('#maskObsRow').classList.add('hidden');
    localStorage.setItem(STORAGE_LAST_TEMPLATE, tplId);
    return;
  }
  if(tplId === 'abertura_padrao'){
    setEncerramentoVisible(false);
    setAberturaVisible(true);
    $('#maskTemplateRow').classList.add('hidden');
    $('#maskObsRow').classList.add('hidden');
    localStorage.setItem(STORAGE_LAST_TEMPLATE, tplId);
    return;
  }
  setEncerramentoVisible(false);
  setAberturaVisible(false);
  $('#maskTemplateRow').classList.remove('hidden');
  $('#maskObsRow').classList.remove('hidden');
  const tpl = TEMPLATES.find(t=>t.id===tplId) || TEMPLATES[0];
  const obs = $('#maskObs').value || '';
  localStorage.setItem(STORAGE_LAST_TEMPLATE, tplId);
  localStorage.setItem(STORAGE_LAST_OBS, obs);
  if(!CURRENT) return;
  const data = buildMaskData(CURRENT);
  const text = renderTemplate(tpl.text, data, obs);
  $('#maskText').value = text;
}

function setTemplatesList(templates){
  TEMPLATES = getTemplates(templates);
  const sel = $('#maskTemplate');
  sel.innerHTML = '';
  for(const t of TEMPLATES){
    const opt = el('option');
    opt.value = t.id;
    opt.textContent = t.name;
    sel.appendChild(opt);
  }
  const encOpt = el('option');
  encOpt.value = 'encerramento';
  encOpt.textContent = 'Encerramento';
  sel.appendChild(encOpt);
  const abOpt = el('option');
  abOpt.value = 'abertura_padrao';
  abOpt.textContent = 'MÁSCARA DE ABERTURA (PADRÃO IMAGEM)';
  sel.appendChild(abOpt);
  const last = localStorage.getItem(STORAGE_LAST_TEMPLATE);
  if(last && TEMPLATES.some(t=>t.id===last)) sel.value = last;
  if(last === 'encerramento') sel.value = 'encerramento';
  if(last === 'abertura_padrao') sel.value = 'abertura_padrao';
  refreshMask();
}

function selectRecord(code){
  if(!INDEX || !INDEX.mapByCodUl.has(code)) return;
  const r = INDEX.mapByCodUl.get(code);
  CURRENT = r;
  renderConsulta(r);
  refreshMask();
  prefillAberturaFromRecord(r);
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
  const templates = await getMeta(DB, META_TEMPLATES);
  const importInfo = await getMeta(DB, META_IMPORT);
  const customCauses = await getMeta(DB, META_CUSTOM_CAUSES);
  const aberturaState = await getMeta(DB, META_ABERTURA_LAST);
  CUSTOM_CAUSES = Array.isArray(customCauses) ? customCauses : [];

  if(records.length === 0){
    INDEX = null;
    setSearchEnabled(false);
    setResultsHint('Importe o XLSX para comecar.');
  } else {
    INDEX = buildSearchIndex(records);
    setSearchEnabled(true);
    setResultsHint(`Base carregada: ${records.length.toLocaleString('pt-BR')} registros.`);
  }

  setTemplatesList(templates);
  const obs = localStorage.getItem(STORAGE_LAST_OBS);
  if(obs) $('#maskObs').value = obs;
  populateEncerramentoOptions();
  populateAberturaDefeitos();
  const lastName = localStorage.getItem(STORAGE_LAST_CONTACT_NAME);
  const lastTel = localStorage.getItem(STORAGE_LAST_CONTACT_PHONE);
  if(lastName) $('#encContatoNome').value = lastName;
  if(lastTel) $('#encContatoTel').value = lastTel;
  if(aberturaState) applyAberturaState(aberturaState);
  const localAbertura = loadAberturaState();
  if(!aberturaState && localAbertura) applyAberturaState(localAbertura);
  if(!$('#abReclamacao').value) ensureAberturaReclamacaoDefault(true);

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
  });

  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click', ()=>activateTab(b.dataset.tab)));

  $('#maskTemplate').addEventListener('change', refreshMask);
  $('#maskObs').addEventListener('input', refreshMask);
  $('#encFalha').addEventListener('change', refreshEncerramento);
  $('#encDataHora').addEventListener('change', refreshEncerramento);
  $('#encSegundos').addEventListener('input', refreshEncerramento);
  $('#encCausa').addEventListener('change', refreshEncerramento);
  $('#encContatoNome').addEventListener('input', refreshEncerramento);
  $('#encContatoTel').addEventListener('input', refreshEncerramento);

  $('#abDesignacao').addEventListener('input', refreshAbertura);
  $('#abCodUl').addEventListener('input', refreshAbertura);
  $('#abCliente').addEventListener('input', refreshAbertura);
  $('#abProtocoloOi').addEventListener('input', refreshAbertura);
  $('#abTipoSolic').addEventListener('input', refreshAbertura);
  $('#abProvedor').addEventListener('input', refreshAbertura);
  $('#abReincidente').addEventListener('change', refreshAbertura);
  $('#abEscalonado').addEventListener('input', refreshAbertura);
  $('#abDataHoraQueda').addEventListener('change', refreshAbertura);
  $('#abTsCliente').addEventListener('change', refreshAbertura);
  $('#abDefeito').addEventListener('change', ()=>{
    if(!ABERTURA_EDITED) ensureAberturaReclamacaoDefault(true);
    refreshAbertura();
  });
  $('#abHorarioFunc').addEventListener('input', refreshAbertura);
  $('#abContatoLocal').addEventListener('input', refreshAbertura);
  $('#abContatoValidacao').addEventListener('input', refreshAbertura);
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
    populateEncerramentoOptions();
    $('#encCausa').value = trimmed;
    refreshEncerramento();
  });

  $('#btnLastContato').addEventListener('click', ()=>{
    const lastName = localStorage.getItem(STORAGE_LAST_CONTACT_NAME) || '';
    const lastTel = localStorage.getItem(STORAGE_LAST_CONTACT_PHONE) || '';
    $('#encContatoNome').value = lastName;
    $('#encContatoTel').value = lastTel;
    refreshEncerramento();
  });

  $('#btnCopiarMascara').addEventListener('click', async ()=>{
    const t = $('#maskText').value;
    try{
      await navigator.clipboard.writeText(t);
      $('#copystatus').textContent='Copiado.';
      setTimeout(()=>$('#copystatus').textContent='',1200);
    } catch {
      $('#copystatus').textContent='Nao foi possivel copiar automaticamente. Selecione o texto e copie manualmente.';
    }
  });

  $('#btnDownloadMascara').addEventListener('click', ()=>{
    const text = $('#maskText').value;
    if(!text) return;
    const now = new Date();
    const pad = (x)=> String(x).padStart(2,'0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const code = CURRENT ? (getRecordCode(CURRENT) || 'sem_codigo') : 'sem_codigo';
    const tpl = $('#maskTemplate').value;
    const name = tpl === 'encerramento'
      ? 'encerramento'
      : (tpl === 'abertura_padrao' ? 'abertura_padrao' : 'mascara');
    const filename = `${name}_${code}_${stamp}.txt`;
    const blob = new Blob([text], {type:'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  });

  $('#btnLimparMascara').addEventListener('click', ()=>{
    const tpl = $('#maskTemplate').value;
    if(tpl === 'encerramento'){
      resetEncerramentoForm();
    } else if(tpl === 'abertura_padrao'){
      $('#abDesignacao').value = '';
      $('#abCodUl').value = '';
      $('#abCliente').value = '';
      $('#abProtocoloOi').value = '';
      $('#abTipoSolic').value = 'ABERTURA';
      $('#abProvedor').value = '';
      $('#abReincidente').value = 'NAO';
      $('#abEscalonado').value = '';
      $('#abDataHoraQueda').value = '';
      $('#abTsCliente').value = 'NAO';
      $('#abHorarioFunc').value = '';
      $('#abContatoLocal').value = '';
      $('#abContatoValidacao').value = '';
      ABERTURA_EDITED = false;
      ensureAberturaReclamacaoDefault(true);
      $('#maskText').value = '';
      localStorage.removeItem(STORAGE_ABERTURA_LAST);
      setMeta(DB, META_ABERTURA_LAST, null);
    } else {
      $('#maskObs').value = '';
      $('#maskText').value = '';
      localStorage.removeItem(STORAGE_LAST_OBS);
    }
  });

  $('#btnImportXlsx').addEventListener('click', async ()=>{
    const file = $('#xlsxFile').files && $('#xlsxFile').files[0];
    if(!file){
      setStatus('#importStatus', ['Selecione um arquivo XLSX para importar.']);
      return;
    }
    setStatus('#importStatus', ['Lendo arquivo...']);
    try{
      const {records, report, templates} = await importXlsxFile(file);
      setStatus('#importStatus', ['Salvando...']);
      await clearRecords(DB);
      await putManyRecords(DB, records);
      await setMeta(DB, META_IMPORT, report);
      await setMeta(DB, META_TEMPLATES, templates);
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
    refreshMask();
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
