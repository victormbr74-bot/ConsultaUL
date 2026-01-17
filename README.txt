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

Observacoes:
- Persistencia principal: IndexedDB (lotericasDB / records / meta)
- localStorage usado apenas para preferencias (ultima busca, template, observacao)
- Nao envia dados para a internet
