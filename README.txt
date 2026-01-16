SISTEMA WEB (LOCAL) - CONSULTA LOTERICAS

1) Rode localmente (recomendado):
   - Abra um terminal dentro desta pasta
   - Execute: python -m http.server 8000
   - Abra: http://localhost:8000

2) Como funciona:
   - data.json: base extraida da planilha (CONSULTA MASSIVA + MACRO_COD_UL)
   - index.html + app.js: interface com busca e duas abas (Consulta / Mascara)

3) Alterar a mascara:
   - Edite a funcao buildMascara() em app.js para refletir exatamente o texto/padroes do seu time.

4) Segurança:
   - Nao envia nada para internet. Tudo roda no seu PC.
