# ConsultaLotericas (ConsultaUL)

App estático que roda no GitHub Pages e mantém a base oficial offline (IndexedDB + `base.xlsx`). A nova camada de autenticação usa Firebase Auth/Firestore/Functions, com reset guiado e administração segura.

## Rodando o front-end

1. Publique o repositório no GitHub Pages (o arquivo `base.xlsx` deve ficar na raiz pública). O site carregará `base.xlsx` automaticamente sempre que não existir base local e exibirá o banner fixo "Alterações feitas aqui são locais. A base oficial será carregada toda sexta-feira."
2. Para testar localmente, rode `python -m http.server 8000` e acesse `http://localhost:8000`. O login (`login.html`) abre diretamente; o usuário sempre digita o ID e a senha padrão `Oi@12345` (depois troca no primeiro acesso).
3. A base continua armazenada em IndexedDB e pode ser atualizada/exportada pela interface existente (sem depender do Firebase).

## Autenticação Firebase

- O arquivo `src/firebaseClient.js` inicializa o SDK com as credenciais fornecidas, expõe `window.FirebaseClient` e disponibiliza `auth.js` para as páginas estáticas.
- O fluxo principal (login, change password, index) chama `window.requireAuthOrRedirect` para proteger rotas, redirecionar quem ainda precisa trocar a senha e mostrar o nome/ID do usuário logado.
- A URL lógica para login é `login.html`, troca obrigatória `change-password.html`, painel principal `index.html` e painel administrativo `admin.html`.
- O conjunto fixo de IDs está em `data/users.json` e serve tanto para validar no front-end quanto para o script `scripts/createUsers.js` que insere os usuários no Firebase Auth/Firestore. O usuário 418118 é marcado como `admin`.

## Painel ADM e reset de senha

- O painel `admin.html` lista `password_reset_requests` com status `pending` (apenas para admins). Cada card mostra ID, data, quem solicitou e observação.
- Botões "Aprovar" e "Rejeitar" disparam ações: aprova chama `adminResetPassword` (Cloud Function) e rejeita atualiza o documento com `status = rejected` e `adminNote`.
- A Cloud Function reseta a senha para `Oi@12345`, marca `users/{uid}.mustChangePassword = true` e atualiza o pedido com `status = approved`.

## Scripts e tooling

- **Criar usuários:** configure `GOOGLE_APPLICATION_CREDENTIALS` apontando para o service account JSON (não commitado) e rode `npm install` no root. Depois execute `npm run create-users` — o script usa `data/users.json`, ignora usuários existentes e cria o doc `/users/{uid}` com `mustChangePassword: true`.
- **Dependências:** o root `package.json` instala `firebase-admin` para o script. O diretório `functions` tem seu próprio `package.json` e deve instalar `firebase-admin` + `firebase-functions` antes do deploy.

## Deploy das Cloud Functions e regras

1. Instale o Firebase CLI (`npm install -g firebase-tools`), autentique com `firebase login` e escolha o projeto `consultaul-3e300`.
2. No diretório `functions`, rode `npm install` para resolver dependências, depois `firebase deploy --only functions` para subir `adminResetPassword`.
3. Use `firebase deploy --only firestore:rules` ou `firebase deploy` completo para aplicar `firestore.rules` (que escreveu as permissões descritas abaixo).
4. O `firebase.json` já referencia `functions` e `firestore.rules`.

## Regras do Firestore (`firestore.rules`)

- `/users/{uid}`: qualquer autenticado lê apenas o próprio documento; apenas admin pode escrever.
- `/password_reset_requests/{id}`: qualquer autenticado pode criar; admin lê todos e atualiza status; usuários comuns leem apenas seus próprios pedidos (quando `requestedByUid` estiver definido).

## Fluxo de "Esqueci a senha"

1. Na tela de login há um modal com ID e campo opcional. Ao enviar, um documento com `status = pending` é gravado em `/password_reset_requests` (sem usar e-mail real).
2. O ADM visualiza as solicitações, aprova (chamando a Callable Function) ou rejeita (atualizando o documento com motivo).
3. A Cloud Function valida o admin, reseta a senha via Admin SDK, força `mustChangePassword = true` e marca o pedido como `approved`.
4. No próximo login, o usuário é obrigado a usar `change-password.html` antes de acessar o app.

## Observações adicionais

- A interface local continua usando IndexedDB para manter a base e apresenta o aviso do banner/snackbar sempre que há alterações locais.
- O `auth.css` agora inclui o modal de "Esqueci a senha" e o painel administrativo reutiliza a mesma paleta visual.
