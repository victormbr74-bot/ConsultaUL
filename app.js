/*
  Static app: XLSX import -> IndexedDB -> search/masks
*/

let DB = null;
let INDEX = null;
let CURRENT = null;
let TEMPLATES = [];

const VIEWS = ['consulta','mascara','importar','loterica'];
const META_IMPORT = 'import_info';
const META_TEMPLATES = 'templates';

const STORAGE_LAST_QUERY = 'last_query';
const STORAGE_LAST_TEMPLATE = 'last_template';
const STORAGE_LAST_OBS = 'last_obs';

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
  const last = localStorage.getItem(STORAGE_LAST_TEMPLATE);
  if(last && TEMPLATES.some(t=>t.id===last)) sel.value = last;
  if(CURRENT) refreshMask();
}

function selectRecord(code){
  if(!INDEX || !INDEX.mapByCodUl.has(code)) return;
  const r = INDEX.mapByCodUl.get(code);
  CURRENT = r;
  renderConsulta(r);
  refreshMask();
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
