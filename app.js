/*
  App 100% local: carrega data.json, permite buscar e renderiza:
  - Aba Consulta (estilo planilha CONSULTA)
  - Aba Mascara (estilo MASCARAS ABERTURA)
*/

let DB = null;
let CURRENT = null;

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls) => { const n=document.createElement(tag); if(cls) n.className=cls; return n; };

function norm(s){
  return String(s ?? '').toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .replace(/\s+/g,' ').trim();
}

async function loadDB(){
  const res = await fetch('data.json', {cache:'no-store'});
  if(!res.ok) throw new Error('Falha ao carregar data.json');
  const obj = await res.json();
  // obj é um mapa { codigoUL: {..campos..}, ... }
  DB = obj;
}

function pickField(r, keys){
  for(const k of keys){
    if(r && r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '') return r[k];
  }
  return '';
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
    const code = pickField(r, ['COD. UL','Ponto Lógico','Ponto Lógico / \nDesignação']);
    const name = pickField(r, ['NOME DA LOTERICA','NOME UL']);
    const uf = pickField(r, ['UF']);
    const owner = pickField(r, ['OWNER']);
    const mig = pickField(r, ['MIGRAÇÃO','MIGRACAO']);
    const ccto = pickField(r, ['CCTO OI','BASE UN','BASE MIGRAÇÕES','CCTO OEMP','CIRCUITO OEMP']);

    const s=el('strong');
    s.textContent = `${code} — ${name}`;
    const m=el('div','meta');
    m.textContent = `UF: ${uf || '-'} | Owner: ${owner || '-'} | Migração: ${mig || '-'} | CCTO/Designação: ${ccto || '-'}`;
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

function search(q){
  if(!DB) return [];
  const nq = norm(q);
  if(!nq) return [];

  // prioridade: match exato por código UL
  const exact = DB[q.trim()];
  if(exact) return [exact];

  // varredura (nome, contato, designação, ccto, etc.)
  const out=[];
  for(const k in DB){
    const r=DB[k];
    const hay = norm([
      k,
      pickField(r,['NOME DA LOTERICA','NOME UL']),
      pickField(r,['CCTO OI','BASE UN','BASE MIGRAÇÕES','CCTO OEMP','CIRCUITO OEMP']),
      pickField(r,['ENDEREÇO','ENDERECO']),
      pickField(r,['CONTATO']),
      pickField(r,['OWNER']),
      pickField(r,['OPERADORA','OPERADORA BACKUP']),
      pickField(r,['IP NAT','IP de NAT','IP WAN']),
      pickField(r,['LOOPBACK PRINCIPAL','LOOPBACK SECUNDARIO','LOOPBACK SWITCH']),
    ].join(' | '));

    if(hay.includes(nq)) out.push(r);
  }
  return out;
}

function excelSerialToLocalDateTime(serial){
  // Excel: 1 = 1899-12-31 (com bug do 1900 bissexto). Para uso prático, essa conversão padrão funciona bem.
  const n = Number(serial);
  if(!Number.isFinite(n)) return '';
  const epoch = new Date(Date.UTC(1899,11,30));
  const ms = Math.round(n * 86400000);
  const d = new Date(epoch.getTime() + ms);
  // formata dd/MM/yyyy HH:mm
  const pad = (x)=> String(x).padStart(2,'0');
  const dd=pad(d.getDate()), mm=pad(d.getMonth()+1), yyyy=d.getFullYear();
  const hh=pad(d.getHours()), mi=pad(d.getMinutes());
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function renderConsulta(r){
  const code = pickField(r, ['COD. UL','Ponto Lógico','Ponto Lógico / \nDesignação']);
  const nome = pickField(r, ['NOME DA LOTERICA','NOME UL']);
  const endereco = pickField(r, ['ENDEREÇO','ENDERECO']);
  const uf = pickField(r, ['UF']);
  const contato = pickField(r, ['CONTATO']);
  const status = pickField(r, ['STATUS UL','STATUS']);
  const homolog = pickField(r, ['HOMOLOGADO','HOMOLOGADO']);
  const migr = pickField(r, ['MIGRAÇÃO','MIGRACAO']);
  const owner = pickField(r, ['OWNER']);
  const tipo = pickField(r, ['TIPO UL','TIPO LOTERICA']);
  const tfl = pickField(r, ['TFLs','TFL']);

  const cctoOi = pickField(r, ['CCTO OI','BASE UN']);
  const ipNat = pickField(r, ['IP NAT','IP de NAT']);
  const ipWan = pickField(r, ['IP WAN']);
  const loopP = pickField(r, ['LOOPBACK PRINCIPAL','LOOPBACK PRIMARIO','LOOTPBACK PRIMARIO']);
  const loopSw = pickField(r, ['LOOPBACK SWITCH']);

  const empOemp = pickField(r, ['EMPRESA OEMP']);
  const cctoOemp = pickField(r, ['CCTO OEMP','CCTO OEMP','CIRCUITO OEMP']);
  const loopS = pickField(r, ['LOOPBACK SECUNDARIO','LOOPBACK BACKUP']);
  const oper = pickField(r, ['OPERADORA','OPERADORA BACKUP']);
  const respBackup = pickField(r, ['RESP BACKUP','RESP BACKUP']);

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
    ['Código UL', code],
    ['Nome', nome],
    ['Status', status],
    ['UF', uf],
    ['Contato', contato],
    ['Endereço', endereco],
    ['Homologado', homolog],
    ['Migração', migr],
    ['Owner', owner],
    ['Tipo', tipo],
    ['TFL', tfl],
  ]);

  putKV('#kv-principal', [
    ['Designação/CCTO', cctoOi],
    ['IP NAT', ipNat],
    ['IP WAN', ipWan],
    ['Loopback primário', loopP],
    ['Loopback switch', loopSw],
  ]);

  putKV('#kv-backup', [
    ['Empresa OEMP', empOemp],
    ['Circuito/CCTO OEMP', cctoOemp],
    ['Loopback backup', loopS],
    ['Operadora backup', oper],
    ['Responsável backup', respBackup],
  ]);

  // comandos
  const cmds = $('#cmds');
  cmds.innerHTML='';
  const cmdList=[];
  if(loopP) cmdList.push(['SSH primário', `ssh ${loopP}`]);
  if(loopS && loopS !== '0') cmdList.push(['SSH backup', `ssh ${loopS}`]);
  if(loopP) cmdList.push(['Ping primário (MTU)', `ping ${loopP} df-bit size 1472 source Gi0/0/1.1090 repeat 10`]);
  if(loopS && loopS !== '0') cmdList.push(['Ping backup', `ping ${loopS} df-bit size 1300 source Gi0/0/1.1090 repeat 10`]);
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

function buildMascara(r){
  const code = pickField(r, ['COD. UL','Ponto Lógico','Ponto Lógico / \nDesignação']);
  const nome = pickField(r, ['NOME DA LOTERICA','NOME UL']);
  const endereco = pickField(r, ['ENDEREÇO','ENDERECO']);
  const contato = pickField(r, ['CONTATO']);
  const uf = pickField(r, ['UF']);
  const operadora = pickField(r, ['OPERADORA','OPERADORA BACKUP']);
  const cctoOi = pickField(r, ['CCTO OI','BASE UN']);
  const provedor = pickField(r, ['EMPRESA OEMP']);

  const now = new Date();
  const pad=(x)=>String(x).padStart(2,'0');
  const nowStr = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  return `ABERTURA DE CHAMADO OEMP / MAM (GERADO)

NOME SOLICITANTE: CEC CAIXA
CÓDIGO UL: ${code}
NOME DA UL: ${nome}
ENDEREÇO UL: ${endereco}
CONTATO LOCAL: ${contato}
MUNICIPIO/ESTADO: ${uf}

OPERADORA (backup/4G): ${operadora || '-'}
CIRCUITO OI (designação): ${cctoOi || '-'}
PROVEDOR / OEMP: ${provedor || 'NÃO OEMP'}

MOTIVO DO CHAMADO: (preencha) EX: LINK INOPERANTE / PERDA DE PACOTE / INTERMITÊNCIA
DEFEITO RECLAMADO: (preencha)
TROUBLESHOOTING: (preencha) EX: Ping, teste via SSH, roteamento, troca de cabo, etc.

DATA E HORA DA QUEDA: ${nowStr}
HORÁRIO DE FUNCIONAMENTO: (preencha)
HORÁRIO DE ACESSO: (preencha)

OBS:
- Ajuste os campos acima conforme o cenário real.
- Se houver backup, inclua loopback/operadora e testes.
`;
}

function selectRecord(code){
  const r = DB[code];
  if(!r) return;
  CURRENT = r;
  renderConsulta(r);
  $('#maskText').value = buildMascara(r);
  // feedback visual
  $('#results').innerHTML = `<div class="hint">Registro selecionado: <code>${code}</code></div>`;
  // foca na aba consulta
  activateTab('consulta');
}

function activateTab(tab){
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  $('#view-consulta').classList.toggle('hidden', tab!=='consulta');
  $('#view-mascara').classList.toggle('hidden', tab!=='mascara');
}

function wireUI(){
  $('#btnBuscar').addEventListener('click', ()=>{
    const q=$('#q').value;
    renderResults(search(q));
  });
  $('#q').addEventListener('keydown', (e)=>{
    if(e.key==='Enter') $('#btnBuscar').click();
  });
  $('#btnLimpar').addEventListener('click', ()=>{
    $('#q').value='';
    $('#results').innerHTML='';
    CURRENT=null;
    // limpa panels
    ['#kv-loterica','#kv-principal','#kv-backup','#cmds'].forEach(sel=>$(sel).innerHTML='');
    $('#maskText').value='';
  });

  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click', ()=>activateTab(b.dataset.tab)));

  $('#btnCopiarMascara').addEventListener('click', async ()=>{
    const t = $('#maskText').value;
    try{
      await navigator.clipboard.writeText(t);
      $('#copystatus').textContent='Copiado.';
      setTimeout(()=>$('#copystatus').textContent='',1200);
    } catch {
      $('#copystatus').textContent='Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.';
    }
  });
}

(async function main(){
  wireUI();
  try{
    await loadDB();
    $('#results').innerHTML = `<div class="hint">Base carregada: ${Object.keys(DB).length.toLocaleString('pt-BR')} registros.</div>`;
  } catch (e){
    console.error(e);
    $('#results').innerHTML = `<div class="hint">Erro ao carregar a base. Rode com <code>python -m http.server 8000</code> e abra <code>http://localhost:8000</code>.</div>`;
  }
})();
