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
- O painel "Aparência" fica acessível pelo ícone de paleta na AppBar.
- Modos disponíveis: Seguir sistema / Claro / Escuro. A seleção fica em `theme_mode`.
- Paleta fixa de 5 cores: Azul (#2563EB), Ciano (#06B6D4), Roxo (#7C3AED), Verde (#22C55E) e Laranja (#F97316). A escolha persiste em `theme_color` e atualiza AppBar, botões e chips ao vivo.
- Densidade compacta ou confortável salva em `theme_density` e altera padding/bordas.

Exportar e publicar a base:
- A aba "Importar base (XLSX)" mostra um aviso de que o GitHub Pages é somente leitura; para publicar, use o botão "Exportar base (XLSX)" e substitua `base.xlsx` no repositório (até 1x por semana).
- O download gera `base_atualizada_YYYY-MM-DD_HHMMSS.xlsx` com uma planilha BASE (todos os registros) e META (última importação, contagem e fonte).
- Depois de exportar, o badge "Alterações locais pendentes" some; o botão "Atualizar lotérica" seta o badge quando há edições locais.
