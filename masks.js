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
