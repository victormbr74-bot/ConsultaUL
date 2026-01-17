/* Field mapping and lookup for Consulta view */

const fieldMap = {
  cd_ul_ou_ccto: ['CD UL OU CCTO','CD_UL_OU_CCTO','CCTO','CCTO OI','CD_UL','ccto_oi'],
  codigo_ul: ['CODIGO DA UL','COD UL','COD_UL','PONTO LOGICO','Ponto Logico','cod_ul'],
  nome_ul: ['NOME UL','NOME_DA_UL','NOME LOTERICA','NOME','NOME DA LOTERICA','nome_loterica'],
  status: ['STATUS','STATUS UL','status'],
  contato: ['CONTATO','CONTATO LOCAL','TELEFONE','CONTATO_UL','contato'],
  uf: ['UF','ESTADO','uf'],
  homolo: ['HOMOLO','HOMOLOGACAO','HOMOLOGADO','homologado'],
  migracao: ['MIGRACAO','migracao'],
  meraki: ['MERAKI','MERAKI ID','MERAKI_SERIAL','meraki'],
  owner: ['OWNER','PROPRIETARIO','RESPONSAVEL','owner'],
  tfl: ['TFL','TFLS','tfl'],
  tipo_ul: ['TIPO DE UL','TIPO_UL','TIPO UL','TIPO LOTERICA','tipo_ul'],

  designacao_atual_antiga: ['DESIGNACAO ATUAL OU ANTIGA (SEMPRE CONSULTAR NAS FERRAMENTAS PARA TER MAS ACERTIVA)','DESIGNACAO ATUAL','DESIGNACAO','ccto_oi','base_un'],
  designacao_nova: ['DESIGNACAO NOVA'],
  ip_nat: ['IP de NAT','IP NAT','NAT','ip_nat'],
  ip_wan: ['IP WAN','WAN','ip_wan'],
  loopback_primario: ['LOOPBACK PRIMARIO','LOOPBACK PRIMARY','LOOPBACK WAN','LOOPBACK PRINCIPAL','LOOPBACK PRIMARIO','loopback_wan'],
  loopback_switch: ['LOOPBACK SWITCH','IP SWITCH','SWITCH','loopback_lan'],
  perimetro: ['PERIMETRO','perimetro'],
  switch: ['SWITCH','MODELO SWITCH','SWITCH MODEL','SWITCH','ip_switch','switch'],
  empresa_oemp: ['EMPRESA OEMP','OEMP','EMPRESA','empresa_oemp'],
  circuito_oemp: ['CIRCUITO OEMP','CIRCUITO_OEMP','CCTO OEMP','ccto_oemp'],

  responsavel_backup: ['RESPONSAVEL BACKUP','RESP BACKUP','resp_backup'],
  tecnologia_backup: ['TECNOLOGIA','TECNOLOGIA BACKUP','tecnologia'],
  operadora_4g: ['OPERADORA 4G','OPERADORA','OPERADORA BACKUP','operadora'],
  loopback_backup: ['LOOPBACK BACKUP','LOOPBACK SECUNDARIO','loopback_backup','loopback_lan'],
  rede_lan: ['REDE LAN','LAN','IP LAN','rede_lan'],

  acesso_primario: ['ACESSO PRIMARIO','SSH PRIMARIO','ACESSO PRIMARY'],
  acesso_secundario: ['ACESSO SECUNDARIO','SSH SECUNDARIO'],
  ping_primario: ['PING PRIMARIO'],
  tempo_roteamento_primario: ['TEMPO ROTEAMENTO PRIMARIO','TEMPO ROTEAMENTO PRIMARY','ROTEAMENTO PRIMARIO'],
  ping_secundario: ['PING SECUNDARIO'],
  tempo_roteamento_secundario: ['TEMPO ROTEAMENTO SECUNDARIO','ROTEAMENTO SECUNDARIO'],

  endereco: ['ENDERECO','ENDERECO UL','endereco'],
  horario_funcionamento: ['HORARIO DE FUNCIONAMENTO','horario_funcionamento'],
};

function normalizeFieldKey(input){
  return String(input || '').toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .replace(/[^a-z0-9]+/g,'_')
    .replace(/^_+|_+$/g,'');
}

function getField(record, key){
  if(!record) return '—';
  const candidates = fieldMap[key] || [key];
  for(const cand of candidates){
    if(record[cand] !== undefined && record[cand] !== null && String(record[cand]).trim() !== ''){
      return String(record[cand]).trim();
    }
  }
  const normMap = {};
  for(const k of Object.keys(record)){
    normMap[normalizeFieldKey(k)] = record[k];
  }
  for(const cand of candidates){
    const norm = normalizeFieldKey(cand);
    const v = normMap[norm];
    if(v !== undefined && v !== null && String(v).trim() !== ''){
      return String(v).trim();
    }
  }
  return '—';
}
