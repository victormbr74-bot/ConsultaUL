SISTEMA WEB (STATICO) - CONSULTA LOTERICAS

Como rodar localmente:
1) Abra um terminal dentro desta pasta
2) Execute: python -m http.server 8000
3) Abra: http://localhost:8000

Como importar XLSX:
1) Abra a aba "Importar base (XLSX)"
2) Selecione o arquivo .xlsx
3) Clique em "Importar XLSX"
4) O app mostra um relatorio e salva no IndexedDB (offline)

Atualizar base a partir do site:
1) Publique o arquivo `base.xlsx` na raiz do repositorio
2) Na aba "Importar base (XLSX)", clique em "Atualizar base (XLSX do site)"
3) O app baixa `./base.xlsx` com cache buster (?v=timestamp) e atualiza o IndexedDB

Apagar base local:
- Na aba "Importar base (XLSX)", clique em "Apagar base local"

Exportar JSON da base (backup):
- Na aba "Importar base (XLSX)", clique em "Exportar JSON da base"

Importar JSON da base (restaurar):
- Na aba "Importar base (XLSX)", selecione o JSON e clique em "Importar JSON da base"

GitHub Pages:
- O app e 100% front-end, funciona via arquivos estaticos.
- Publique o repositorio no GitHub Pages e acesse normalmente.
- Para atualizacao automatica, mantenha `base.xlsx` na raiz do repo publicado.

Base automática:
- O site verifica o IndexedDB ao carregar e, se nao houver base local, tenta baixar `./base.xlsx?v=timestamp` da raiz do site (sem backend nem interação).
- O arquivo deve estar no mesmo nivel de `index.html`/`styles.css`, caso contrario aparece o aviso discreto “Base automática não encontrada. Use Importar XLSX.” e o botão manual continua funcionando.
- Para forçar novo download mesmo com base local, use o botão “Atualizar base (base.xlsx)”.
- A interface mostra “Última atualização: data/hora” sempre que a base é carregada.

Observacoes:
- Persistencia principal: IndexedDB (lotericasDB / records / meta)
- localStorage usado apenas para preferencias (ultima busca, template, observacao)
- Nao envia dados para a internet

Preferencias de aparencia:
- O painel "Aparência" fica acessível pelo ícone de paleta no canto superior direito.
- As escolhas (modo: system/light/dark, cores primary/secondary e densidade comfortable/compact) são salvas no localStorage com as chaves `theme_mode`, `theme_primary`, `theme_secondary` e `theme_density`.
- Cores podem ser digitadas como `#RGB` ou `#RRGGBB` e são normalizadas imediatamente. O tema do AppBar, botões, tabs e chips acompanha as seleções em tempo real, mantendo contraste adequado.

Exportar XLSX atualizado:
- Dentro da aba "Importar base (XLSX)" há um card "Exportar base atualizada" com o botão "Baixar base.xlsx atualizado".
- O download gera um arquivo `base_atualizada_YYYY-MM-DD_HHMMSS.xlsx` contendo uma planilha BASE com os registros atuais (colunas normalizadas) e uma planilha META com `lastUpdate`, `recordCount` e `source`.
- Use esse arquivo para substituir o `base.xlsx` publicado no repositório/GitHub Pages, já que o Pages serve apenas arquivos estáticos e não grava em tempo de execução.
