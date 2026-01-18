/* Mask templates and rendering */

const DEFAULT_TEMPLATES = [
  {
    id: 'tpl_default',
    name: 'Padrao',
    text:
`ABERTURA DE CHAMADO (GERADO)

CODIGO UL: {cod_ul}
NOME DA LOTERICA: {nome_loterica}
ENDERECO: {endereco}
CIDADE/UF: {cidade} - {uf}

OPERADORA: {operadora}
CCTO OI: {ccto_oi}
CCTO OEMP: {ccto_oemp}

IP NAT: {ip_nat}
LOOPBACK WAN: {loopback_wan}
LOOPBACK LAN: {loopback_lan}

STATUS: {status}
OBSERVACAO: {observacao}
`
  }
];

const ENCERRAMENTO_FAILS = [
  'Inoperância',
  'intermitencia',
  'perca de pacote',
  'alta latencia',
];

const ENCERRAMENTO_CAUSES = [
  'Causa Operadora - Normalizado após reconfiguração do circuito na rede SDH',
  'Causa Operadora - Normalizado após fusão de fibra.',
  'Causa Operadora - Normalizado após recuperação da rede metalica.',
  'Causa Operadora - Normalizado após reset de modem no cliente.',
  'Causa Operadora - Normalizado após recuperação de DROP otico.',
  'Causa Cliente - Após testes realizados no equipamento não foi identificado falha. Circuito ativo a mais de',
  'Causa Cliente - Normalizado após retorno de energia no ambiente do cliente.',
  'Causa Operadora - Normalizado após troca de cabo/conectores na loterica.',
  'Causa Operadora -  Falha restabelecida após reconfiguração do circuito no Backbone OI (NWB/DATACOM/SDH/RADIO/SATÉLETE)',
  'Causa Operadora - Normalizado após troca de nobreak.',
  'Causa Operadora - Normalizado após troca de SWITCH.',
  'Causa Cliente - Após testes realizados no equipamento não foi identificado falha nos terminais ambos os 3 estão trafegando normalmente.',
  'Causa Cliente - Abertura indevida, Falha não identificada. Link ativo a mais de',
  'Causa Operadora - Link passou por migração, link já normalizado.',
  "Após analise, não foi identificado falha nos link's e nem de TFL. Favor prosseguir na abertura de reparo com categorização correta",
];

const MONTHS_PT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

const ABERTURA_DEFEITOS = [
  'TROCA DE SWITCH',
  'TROCA DE NOBREAK',
  'PONTO LOGICO',
  'CABO DE REDE',
  'LINK INOPERANTE',
  'LINK  INTERMITENTE',
  'LINK ALTA LATENCIA',
  'LINK PERCA DE PACOTE',
  'ROTEADOR',
  'TROCA DE CHIP',
];

const ABERTURA_RECLAMACOES = {
  'TROCA DE SWITCH': 'FAVOR REALIZAR A TROCA DO SWITCH NA UNIDADE',
  'TROCA DE NOBREAK': 'FAVOR REALIZAR A TROCA DO NOBREAK NA UNIDADE',
  'PONTO LOGICO': 'UL reclama de falha em ponto logico. Favor verificar falha e realizar reparo nos pontos!',
  'CABO DE REDE': 'UL reclama de falha no cabo de rede. Favor verificar falha e realizar reparo ou troca no cabo!',
  'LINK INOPERANTE': 'LINK BACKUP INOPERANTE, FAVOR VERIFICAR.',
  'LINK  INTERMITENTE': 'LINK INTERMITENTE',
  'LINK ALTA LATENCIA': 'LINK COM ALTA LATENCIA, FAVOR ANALISAR',
  'LINK PERCA DE PACOTE': 'LINK COM PERCA DE PACOTE, FAVOR ANALISAR',
  'ROTEADOR': 'FAVOR VERIFICAR O CABEAMENTO DA PORTA 1 OU 2 DO ROTEADOR.',
  'TROCA DE CHIP': 'FAVOR REALIZAR A TROCA DO CHIP DE OPERADO NA LOTEICA',
};

const ABERTURA_TIPOS = [
  {value: 'oemp_oi', label: 'MASCARA OEMP OI'},
  {value: 'mam_sct', label: 'ABERTURA MAM/SCT'},
  {value: 'wt_telecom', label: 'MASCARA WT TELECOM'},
  {value: 'ativa', label: 'MASCARA ATIVA'},
];

const DASH = '—';

function normalizeKey(input){
  return String(input || '').toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .replace(/[^a-z0-9]+/g,'_')
    .replace(/^_+|_+$/g,'');
}

function pickRecordValue(record, keys){
  if(!record) return '';
  for(const k of keys){
    if(record[k] !== undefined && record[k] !== null && String(record[k]).trim() !== '') return String(record[k]).trim();
  }
  const normMap = {};
  for(const k of Object.keys(record)){
    normMap[normalizeKey(k)] = record[k];
  }
  for(const k of keys){
    const v = normMap[normalizeKey(k)];
    if(v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function valueOrDash(value){
  const v = String(value || '').trim();
  return v ? v : DASH;
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

function formatAberturaQueda(raw){
  if(!raw) return '';
  const parsed = parseDatePt(raw);
  if(parsed) return formatDateTimeMinutes(parsed);
  return String(raw || '').trim();
}

function getAberturaFields(record, defeito, reclamacao){
  const municipio = pickRecordValue(record, ['municipio','MUNICIPIO','CIDADE']);
  const uf = pickRecordValue(record, ['uf','UF','ESTADO']);
  return {
    contato: valueOrDash(pickRecordValue(record, ['contato','CONTATO','CONTATO LOCAL','TELEFONE','CONTATO_UL'])),
    contato_validacao: valueOrDash(pickRecordValue(record, ['contato_validacao','CONTATO VALIDACAO','CONTATO DE VALIDACAO','CONTATO PARA ACOMPANHAR'])),
    razao_social: valueOrDash(pickRecordValue(record, ['razao_social','RAZAO SOCIAL','RAZÃO SOCIAL','CLIENTE'])),
    cnpj: valueOrDash(pickRecordValue(record, ['cnpj','CNPJ'])),
    endereco: valueOrDash(pickRecordValue(record, ['endereco','ENDERECO','ENDERECO UL'])),
    horario_funcionamento: valueOrDash(pickRecordValue(record, ['horario_funcionamento','HORARIO DE FUNCIONAMENTO'])),
    designacao_oemp: valueOrDash(pickRecordValue(record, ['designacao_oemp','ccto_oemp','CCTO OEMP','CIRCUITO OEMP','CIRCUITO_OEMP','circuito_oemp'])),
    nome_ul: valueOrDash(pickRecordValue(record, ['nome_loterica','NOME DA LOTERICA','NOME UL','NOME LOTERICA'])),
    cod_ul: valueOrDash(pickRecordValue(record, ['cod_ul','COD. UL','CODIGO UL','CODIGO DA UL','Ponto Logico','PONTO LOGICO'])),
    designacao: valueOrDash(pickRecordValue(record, ['designacao','ccto_oi','CCTO OI','BASE UN','DESIGNACAO','Ponto Logico / Designacao'])),
    operadora: valueOrDash(pickRecordValue(record, ['operadora','OPERADORA','OPERADORA BACKUP','OPERADORA 4G'])),
    sim_card: valueOrDash(pickRecordValue(record, ['sim_card','SIM CARD','SIMCARD','CHIP','SIM_CARD'])),
    modelo_roteador: valueOrDash(pickRecordValue(record, ['modelo_roteador','MODELO ROTEADOR','ROTEADOR','MODELO DO ROTEADOR'])),
    cep: valueOrDash(pickRecordValue(record, ['cep','CEP'])),
    municipio_uf: (municipio || uf) ? `${valueOrDash(municipio)} ${valueOrDash(uf)}` : DASH,
    data_hora_queda: valueOrDash(formatAberturaQueda(pickRecordValue(record, ['data_hora_queda','DATA E HORA DA QUEDA','DATA/HORA QUEDA']))),
    defeito_reclamado: valueOrDash(defeito),
    reclamacao_inicial: valueOrDash(reclamacao),
  };
}

const templatesAbertura = {
  oemp_oi(record, defeito, reclamacao){
    const f = getAberturaFields(record, defeito, reclamacao);
    return [
      'MASCARA OEMP OI',
      '',
      'NOME SOLICITANTE: CEC CAIXA',
      `NOME DO CONTATO LOCAL: ${f.contato}`,
      `RAZÃO SOCIAL: ${f.razao_social}`,
      `CNPJ: ${f.cnpj}`,
      `ENDEREÇO: ${f.endereco}`,
      `HORARIO DE ATENDIMENTO: ${f.horario_funcionamento}`,
      'AUTORIZAÇÃO DE ACESSO?: SIM',
      'CHAMADO INTERNO:',
      `CIRCUITO OEMP: ${f.designacao_oemp}`,
      `CONTATO PARA ACOMPANHAR: ${f.contato_validacao}`,
      'ATUALIZAÇÃO: SIM POR VOZ A CADA 1 HORA',
      `DEFEITO RECLAMADO: ${f.defeito_reclamado}`,
      `NOME DA UL: ${f.nome_ul}`,
      `CODIGO UL: ${f.cod_ul}`,
      `CIRCUITO OI: ${f.designacao}`,
    ].join('\n');
  },
  mam_sct(record, defeito, reclamacao){
    const f = getAberturaFields(record, defeito, reclamacao);
    return [
      'ABERTURA MAM/SCT',
      '',
      `CÓDIGO UL: ${f.cod_ul}`,
      `NOME DA UL: ${f.nome_ul}`,
      `ENDEREÇO UL: ${f.endereco}`,
      `CONTATO: ${f.contato}`,
      `HORARIO DE FUNCIONAMENTO: ${f.horario_funcionamento}`,
      `DEFEITO RECLAMADO: ${f.defeito_reclamado}`,
      `OPERADORA: ${f.operadora}`,
      `SIM CARD: ${f.sim_card}`,
      `MODELO ROTEADOR: ${f.modelo_roteador}`,
      `CEP: ${f.cep}`,
      `MUNICIPIO/ESTADO: ${f.municipio_uf}`,
      `TROUBLESHOOTING: ${f.reclamacao_inicial}`,
      `CONTATO DE VALIDAÇÃO: ${f.contato_validacao}`,
      `HORÁRIO DE ACESSO: ${f.horario_funcionamento}`,
      'SEGUE LOG:',
    ].join('\n');
  },
  ativa(record, defeito, reclamacao){
    const f = getAberturaFields(record, defeito, reclamacao);
    return [
      'MASCARA ATIVA',
      '',
      `DESIGNAÇÃO: ${f.designacao_oemp}`,
      `COD. UL: ${f.cod_ul}`,
      `CLIENTE: ${f.razao_social}`,
      'PROTOCOLO OI:',
      'TIPO DE SOLICITAÇÃO: ABERTURA',
      'PROVEDOR: ATIVA',
      'REINCIDENTE: NÃO',
      'JÁ ESCALONADO: N1',
      `DATA E HORA DA QUEDA: ${f.data_hora_queda}`,
      'REALIZADO TS COM O CLIENTE: SIM',
      `DEFEITO RECLAMADO: ${f.defeito_reclamado}`,
      `HORARIO DE FUNCIONAMENTO: ${f.horario_funcionamento}`,
      `CONTATO LOCAL: ${f.contato}`,
      `CONTATO DE VALIDAÇÃO: ${f.contato_validacao}`,
      `RECLAMAÇÃO INICIAL: ${f.reclamacao_inicial}`,
    ].join('\n');
  },
  wt_telecom(record, defeito, reclamacao){
    const f = getAberturaFields(record, defeito, reclamacao);
    return [
      'MASCARA WT TELECOM',
      '',
      `DESIGNAÇÃO/VLAN:${f.designacao_oemp}`,
      `CLIENTE: ${f.nome_ul}`,
      'CHAMADO INTERNO:',
      `DEFEITO RECLAMADO: ${f.defeito_reclamado}`,
      'HORARIO DO INCIDENTE:',
      `TELEFONE DE CONTATO: ${f.contato}`,
      'NOME DO SOLICITANTE:',
      `CIRCUITO OI: ${f.designacao}`,
    ].join('\n');
  },
};

function normalizeHorario(value){
  const raw = String(value || '').trim();
  if(!raw) return DASH;
  const m = raw.match(/(\d{1,2})(?::|h)?(\d{2})?\s*(?:a|as|às|-)\s*(\d{1,2})(?::|h)?(\d{2})?/i);
  if(m){
    const h1 = m[1].padStart(2,'0');
    const h2 = m[3].padStart(2,'0');
    const m1 = (m[2] || '00').padStart(2,'0');
    const m2 = (m[4] || '00').padStart(2,'0');
    return `${h1}:${m1} as ${h2}:${m2}`;
  }
  return raw;
}

function getFieldRawValue(record, key){
  if(!record || typeof getField !== 'function') return '';
  const value = getField(record, key);
  if(!value || value === 'ƒ?"' || value === DASH) return '';
  return String(value).trim();
}

function getFieldValue(record, key){
  return valueOrDash(getFieldRawValue(record, key));
}

function getDesignacaoOi(record){
  const fallback = getFieldRawValue(record, 'designacao_nova')
    || getFieldRawValue(record, 'designacao_atual_antiga')
    || getFieldRawValue(record, 'designacao')
    || getFieldRawValue(record, 'ccto');
  return valueOrDash(fallback);
}

function getDesignacaoOemp(record){
  const circuitoOemp = getFieldRawValue(record, 'circuito_oemp');
  if(circuitoOemp) return circuitoOemp;
  return getDesignacaoOi(record);
}

function buildMascaraOempOi(record, defeito){
  return [
    'MASCARA OEMP OI',
    '',
    'NOME SOLICITANTE: CEC CAIXA',
    `NOME DO CONTATO LOCAL: ${getFieldValue(record, 'contato')}`,
    `RAZÃO SOCIAL: ${getFieldValue(record, 'razao_social')}`,
    `CNPJ: ${getFieldValue(record, 'cnpj')}`,
    `ENDEREÇO: ${getFieldValue(record, 'endereco')}`,
    `HORARIO DE ATENDIMENTO: ${normalizeHorario(getFieldRawValue(record, 'horario_funcionamento'))}`,
    'AUTORIZAÇÃO DE ACESSO?: SIM',
    'CHAMADO INTERNO:',
    `CIRCUITO OEMP: ${getFieldValue(record, 'circuito_oemp')}`,
    `CONTATO PARA ACOMPANHAR: ${getFieldValue(record, 'contato_validacao')}`,
    'ATUALIZAÇÃO: SIM POR VOZ A CADA 1 HORA',
    `DEFEITO RECLAMADO: ${valueOrDash(defeito)}`,
    `NOME DA UL: ${getFieldValue(record, 'nome_ul')}`,
    `CODIGO UL: ${getFieldValue(record, 'cod_ul')}`,
    `CIRCUITO OI: ${getDesignacaoOi(record)}`,
  ].join('\n');
}

function buildMascaraMamSct(record, defeito, reclamacao){
  const municipio = getFieldRawValue(record, 'municipio');
  const uf = getFieldRawValue(record, 'uf');
  return [
    'ABERTURA MAM/SCT',
    '',
    `CÓDIGO UL: ${getFieldValue(record, 'cod_ul')}`,
    `NOME DA UL: ${getFieldValue(record, 'nome_ul')}`,
    `ENDEREÇO UL: ${getFieldValue(record, 'endereco')}`,
    `CONTATO: ${getFieldValue(record, 'contato')}`,
    `HORARIO DE FUNCIONAMENTO: ${normalizeHorario(getFieldRawValue(record, 'horario_funcionamento'))}`,
    `DEFEITO RECLAMADO: ${valueOrDash(defeito)}`,
    `OPERADORA: ${getFieldValue(record, 'operadora_4g')}`,
    `SIM CARD: ${getFieldValue(record, 'sim_card')}`,
    `MODELO ROTEADOR: ${getFieldValue(record, 'modelo_roteador')}`,
    `CEP: ${getFieldValue(record, 'cep')}`,
    `MUNICIPIO/ESTADO: ${valueOrDash(municipio)}/${valueOrDash(uf)}`,
    `TROUBLESHOOTING: ${valueOrDash(reclamacao)}`,
    `CONTATO DE VALIDAÇÃO: ${getFieldValue(record, 'contato_validacao')}`,
    `HORÁRIO DE ACESSO: ${normalizeHorario(getFieldRawValue(record, 'horario_funcionamento'))}`,
    'SEGUE LOG:',
  ].join('\n');
}

function buildMascaraWtTelecom(record, defeito){
  return [
    'MASCARA WT TELECOM',
    '',
    'Designação/VLAN:',
    `Cliente: ${getFieldValue(record, 'nome_ul')}`,
    'Chamado interno:',
    `Defeito reclamado: ${valueOrDash(defeito)}`,
    'Horario do incidente:',
    `Telefone de contato: ${getFieldValue(record, 'contato')}`,
    'Nome do solicitante:',
    `Circuito OI: ${getDesignacaoOi(record)}`,
  ].join('\n');
}

function buildMascaraAtiva(record, defeito, reclamacao){
  const quedaRaw = getFieldRawValue(record, 'data_hora_queda');
  const queda = quedaRaw ? formatAberturaQueda(quedaRaw) : DASH;
  return [
    'MASCARA ATIVA',
    '',
    `DESIGNAÇÃO: ${getDesignacaoOemp(record)}`,
    `COD. UL: ${getFieldValue(record, 'cod_ul')}`,
    `CLIENTE: ${getFieldValue(record, 'razao_social')}`,
    'PROTOCOLO OI:',
    'TIPO DE SOLICITAÇÃO: ABERTURA',
    'PROVEDOR: NÃO OEMP',
    'REINCIDENTE: NÃO',
    'JÁ ESCALONADO: N1',
    `DATA E HORA DA QUEDA: ${queda}`,
    'REALIZADO TS COM O CLIENTE: SIM',
    `DEFEITO RECLAMADO: ${valueOrDash(defeito)}`,
    `HORARIO DE FUNCIONAMENTO: ${normalizeHorario(getFieldRawValue(record, 'horario_funcionamento'))}`,
    `CONTATO LOCAL: ${getFieldValue(record, 'contato')}`,
    `CONTATO DE VALIDAÇÃO: ${getFieldValue(record, 'contato_validacao')}`,
    `RECLAMAÇÃO INICIAL: ${valueOrDash(reclamacao)}`,
  ].join('\n');
}

const DASH_SAFE = '—';

function valueOrDashSafe(value){
  const v = String(value || '').trim();
  return v ? v : DASH_SAFE;
}

function getFieldRawSafe(record, key){
  if(!record || typeof getField !== 'function') return '';
  const value = getField(record, key);
  if(!value || value === 'ƒ?"' || value === DASH_SAFE) return '';
  return String(value).trim();
}

function getFieldValueSafe(record, key){
  return valueOrDashSafe(getFieldRawSafe(record, key));
}

function formatAberturaQuedaSafe(raw){
  if(!raw) return '';
  const parsed = parseDatePt(raw);
  if(parsed) return formatDateTimeMinutes(parsed);
  return String(raw || '').trim();
}

function getDesignacao(record){
  const circuitoOemp = getFieldRawSafe(record, 'circuito_oemp');
  if(circuitoOemp) return circuitoOemp;
  const fallback = getFieldRawSafe(record, 'designacao_nova')
    || getFieldRawSafe(record, 'designacao_atual_antiga')
    || getFieldRawSafe(record, 'designacao')
    || getFieldRawSafe(record, 'ccto');
  return valueOrDashSafe(fallback);
}

templatesAbertura.oemp_oi = function(record, defeito){
  return [
    'MASCARA OEMP OI',
    '',
    'NOME SOLICITANTE: CEC CAIXA',
    `NOME DO CONTATO LOCAL: ${getFieldValueSafe(record, 'contato')}`,
    `RAZÃO SOCIAL: ${getFieldValueSafe(record, 'razao_social')}`,
    `CNPJ: ${getFieldValueSafe(record, 'cnpj')}`,
    `ENDEREÇO: ${getFieldValueSafe(record, 'endereco')}`,
    `HORARIO DE ATENDIMENTO: ${getFieldValueSafe(record, 'horario_funcionamento')}`,
    'AUTORIZAÇÃO DE ACESSO?: SIM',
    'CHAMADO INTERNO:',
    `CIRCUITO OEMP: ${getFieldValueSafe(record, 'circuito_oemp')}`,
    `CONTATO PARA ACOMPANHAR: ${getFieldValueSafe(record, 'contato_validacao')}`,
    'ATUALIZAÇÃO: SIM POR VOZ A CADA 1 HORA',
    `DEFEITO RECLAMADO: ${valueOrDashSafe(defeito)}`,
    `NOME DA UL: ${getFieldValueSafe(record, 'nome_ul')}`,
    `CODIGO UL: ${getFieldValueSafe(record, 'cod_ul')}`,
    `CIRCUITO OI: ${getDesignacao(record)}`,
  ].join('\n');
};

templatesAbertura.mam_sct = function(record, defeito, reclamacao){
  const municipio = getFieldRawSafe(record, 'municipio');
  const uf = getFieldRawSafe(record, 'uf');
  return [
    'ABERTURA MAM/SCT',
    '',
    `CÓDIGO UL: ${getFieldValueSafe(record, 'cod_ul')}`,
    `NOME DA UL: ${getFieldValueSafe(record, 'nome_ul')}`,
    `ENDEREÇO UL: ${getFieldValueSafe(record, 'endereco')}`,
    `CONTATO: ${getFieldValueSafe(record, 'contato')}`,
    `HORARIO DE FUNCIONAMENTO: ${getFieldValueSafe(record, 'horario_funcionamento')}`,
    `DEFEITO RECLAMADO: ${valueOrDashSafe(defeito)}`,
    `OPERADORA: ${getFieldValueSafe(record, 'operadora')}`,
    `SIM CARD: ${getFieldValueSafe(record, 'sim_card')}`,
    `MODELO ROTEADOR: ${getFieldValueSafe(record, 'modelo_roteador')}`,
    `CEP: ${getFieldValueSafe(record, 'cep')}`,
    `MUNICIPIO/ESTADO: ${valueOrDashSafe(municipio)}/${valueOrDashSafe(uf)}`,
    `TROUBLESHOOTING: ${valueOrDashSafe(reclamacao)}`,
    `CONTATO DE VALIDAÇÃO: ${getFieldValueSafe(record, 'contato_validacao')}`,
    `HORÁRIO DE ACESSO: ${getFieldValueSafe(record, 'horario_funcionamento')}`,
    'SEGUE LOG:',
  ].join('\n');
};

templatesAbertura.ativa = function(record, defeito, reclamacao){
  const cliente = getFieldRawSafe(record, 'razao_social') || getFieldRawSafe(record, 'cliente');
  const provedor = getFieldRawSafe(record, 'provedor') || 'NÃO OEMP';
  const quedaRaw = getFieldRawSafe(record, 'data_hora_queda');
  const queda = quedaRaw ? formatAberturaQuedaSafe(quedaRaw) : DASH_SAFE;
  return [
    'MASCARA ATIVA',
    '',
    `DESIGNAÇÃO: ${getDesignacao(record)}`,
    `COD. UL: ${getFieldValueSafe(record, 'cod_ul')}`,
    `CLIENTE: ${valueOrDashSafe(cliente)}`,
    'PROTOCOLO OI:',
    'TIPO DE SOLICITAÇÃO: ABERTURA',
    `PROVEDOR: ${provedor}`,
    'REINCIDENTE: NÃO',
    'JÁ ESCALONADO: N1',
    `DATA E HORA DA QUEDA: ${queda}`,
    'REALIZADO TS COM O CLIENTE: SIM',
    `DEFEITO RECLAMADO: ${valueOrDashSafe(defeito)}`,
    `HORARIO DE FUNCIONAMENTO: ${getFieldValueSafe(record, 'horario_funcionamento')}`,
    `CONTATO LOCAL: ${getFieldValueSafe(record, 'contato')}`,
    `CONTATO DE VALIDAÇÃO: ${getFieldValueSafe(record, 'contato_validacao')}`,
    `RECLAMAÇÃO INICIAL: ${valueOrDashSafe(reclamacao)}`,
  ].join('\n');
};

templatesAbertura.wt_telecom = function(record, defeito){
  return [
    'MASCARA WT TELECOM',
    '',
    `DESIGNAÇÃO/VLAN: ${getDesignacao(record)}`,
    `CLIENTE: ${getFieldValueSafe(record, 'nome_ul')}`,
    'CHAMADO INTERNO:',
    `DEFEITO RECLAMADO: ${valueOrDashSafe(defeito)}`,
    'HORARIO DO INCIDENTE:',
    `TELEFONE DE CONTATO: ${getFieldValueSafe(record, 'contato')}`,
    'NOME DO SOLICITANTE:',
    `CIRCUITO OI: ${getDesignacao(record)}`,
  ].join('\n');
};

function resolveMaskValue(record, key, observacao){
  if(key === 'observacao') return observacao || '';
  return record && record[key] ? record[key] : '';
}

function renderTemplate(templateText, record, observacao){
  return templateText.replace(/\{([a-z0-9_]+)\}/g, (_, key)=>{
    const val = resolveMaskValue(record, key, observacao);
    return val !== '' ? val : '-';
  });
}

function getTemplates(custom){
  if(Array.isArray(custom) && custom.length) return custom;
  return DEFAULT_TEMPLATES;
}

function formatEncerramentoDate(date, seconds){
  const pad = (x)=> String(x).padStart(2,'0');
  const d = date;
  const dd = pad(d.getDate());
  const mm = MONTHS_PT[d.getMonth()];
  const yyyy = d.getFullYear();
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(seconds);
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
}

function formatAberturaDate(value){
  if(!value) return '';
  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return '';
  const pad = (x)=> String(x).padStart(2,'0');
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth()+1);
  const yyyy = d.getFullYear();
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function getReclamacaoPadrao(defeito){
  return ABERTURA_RECLAMACOES[defeito] || '';
}

function parseHoraMinutos(text){
  const m = String(text || '').trim().match(/^(\d{1,3}):([0-5]\d)$/);
  if(!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return (h * 3600) + (min * 60);
}

function parseDatePt(text){
  const s = String(text || '').trim();
  if(!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if(!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]) - 1;
  const yyyy = Number(m[3]);
  const hh = Number(m[4]);
  const mi = Number(m[5]);
  const ss = m[6] ? Number(m[6]) : 0;
  const d = new Date(yyyy, mm, dd, hh, mi, ss);
  if(Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDateTimeSeconds(date){
  const pad = (x)=> String(x).padStart(2,'0');
  const dd = pad(date.getDate());
  const mm = pad(date.getMonth()+1);
  const yyyy = date.getFullYear();
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
}

function parseEncerramentoDate(value, secondsInput){
  const now = new Date();
  let date = now;
  if(value){
    const parsed = new Date(value);
    if(!Number.isNaN(parsed.getTime())) date = parsed;
  }
  let seconds = now.getSeconds();
  if(typeof secondsInput === 'string' && secondsInput.trim() !== ''){
    const n = Number(secondsInput);
    if(Number.isFinite(n)){
      seconds = Math.max(0, Math.min(59, Math.round(n)));
    }
  } else if(value){
    seconds = date.getSeconds();
  }
  return formatEncerramentoDate(date, seconds);
}

function buildEncerramentoText(payload){
  const contato = `${payload.contatoNome || '-'} - ${payload.contatoTel || '-'}`;
  return [
    'CEC Caixa',
    `Falha:  ${payload.falha || '-'}`,
    `Horário de normalização:  ${payload.dataHora || '-'}`,
    `Causa/Solução:  ${payload.causa || '-'}`,
    `Contato de Autorização:  ${contato}`,
  ].join('\n');
}

function buildAberturaPadraoText(payload){
  return [
    'MASCARA ATIVA',
    `DESIGNAÇÃO: ${payload.designacao || '-'}`,
    `COD. UL: ${payload.cod_ul || '-'}`,
    `CLIENTE: ${payload.cliente || '-'}`,
    `PROTOCOLO OI: ${payload.protocolo_oi || '-'}`,
    `TIPO DE SOLICITAÇÃO: ${payload.tipo_solicitacao || '-'}`,
    `PROVEDOR: ${payload.provedor || '-'}`,
    `REINCIDENTE: ${payload.reincidente || '-'}`,
    `JÁ ESCALONADO: ${payload.ja_escalonado || '-'}`,
    `DATA E HORA DA QUEDA: ${payload.data_hora_queda || '-'}`,
    `REALIZADO TS COM O CLIENTE: ${payload.realizado_ts || '-'}`,
    `DEFEITO RECLAMADO: ${payload.defeito_reclamado || '-'}`,
    `HORARIO DE FUNCIONAMENTO: ${payload.horario_funcionamento || '-'}`,
    `CONTATO LOCAL: ${payload.contato_local || '-'}`,
    `CONTATO DE VALIDAÇÃO: ${payload.contato_validacao || '-'}`,
    `RECLAMAÇÃO INICIAL: ${payload.reclamacao_inicial || '-'}`,
  ].join('\n');
}

function buildAberturaMinimalText(payload){
  return [
    'MASCARA ATIVA',
    `DESIGNAÇÃO: ${payload.designacao || '-'}`,
    `COD. UL: ${payload.cod_ul || '-'}`,
    `NOME UL: ${payload.nome_ul || '-'}`,
    `ENDEREÇO: ${payload.endereco || '-'}`,
    `CONTATO LOCAL: ${payload.contato_local || '-'}`,
    `HORARIO DE FUNCIONAMENTO: ${payload.horario_funcionamento || '-'}`,
    `OPERADORA: ${payload.operadora || '-'}`,
    `DATA E HORA DA QUEDA: ${payload.data_hora_queda || '-'}`,
    `DEFEITO RECLAMADO: ${payload.defeito_reclamado || '-'}`,
    `RECLAMAÇÃO INICIAL: ${payload.reclamacao_inicial || '-'}`,
  ].join('\n');
}
