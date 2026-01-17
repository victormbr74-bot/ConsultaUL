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

