# Financeiro Escolar — guia de instalação

O app é um **PWA**: um site que se instala como aplicativo no Windows e no Android, guarda os dados no próprio aparelho (funciona sem internet) e sincroniza pelo Google Drive.

Você só precisa fazer isto **uma vez**: (1) colocar o app na internet, (2) criar a credencial do Google para sincronizar, (3) instalar em cada aparelho.

> **Atenção:** o arquivo `dados-escola.json` tem os nomes dos alunos. **Não** envie esse arquivo para o GitHub/Netlify. Ele só serve para importar dentro do app.

---

## 1. Colocar o app na internet (escolha UMA opção)

### Opção A — Netlify Drop (a mais fácil)
1. Descompacte o arquivo `financeiro-escolar-app.zip`.
2. Abra https://app.netlify.com/drop e entre/crie uma conta gratuita.
3. Arraste a **pasta descompactada** para a página. Em segundos você recebe um endereço como `https://nome-aleatorio.netlify.app`.
4. (Opcional) Em *Site configuration → Change site name*, escolha um nome fácil, por exemplo `financeiro-minhaescola.netlify.app`.

### Opção B — GitHub Pages
1. Crie uma conta em https://github.com e depois um repositório **público** chamado `financeiro-escola`.
2. Em *Add file → Upload files*, arraste **o conteúdo** da pasta do app (não o zip) e confirme.
3. Em *Settings → Pages*, escolha *Deploy from a branch → main → /(root)* e salve.
4. Após 1–2 minutos o endereço será `https://SEU-USUARIO.github.io/financeiro-escola/`.

Anote o endereço (só a parte até `.app` ou `.io`, sem barra no final) — você vai usar no passo 2.

---

## 2. Criar a credencial do Google (sincronização)

Serve para o app guardar uma cópia dos dados numa **pasta privada e invisível** do Google Drive de vocês. Só o próprio app consegue abrir esse arquivo.

1. Entre em https://console.cloud.google.com com a conta Google que será usada na escola.
2. No topo, clique em **Selecionar projeto → Novo projeto**. Nome: `Financeiro Escolar`. Criar.
3. Menu **APIs e serviços → Biblioteca**. Procure **Google Drive API** e clique em **Ativar**.
4. Menu **APIs e serviços → Tela de permissão OAuth** (ou *Google Auth Platform*):
   - Tipo de usuário: **Externo**.
   - Nome do app: `Financeiro Escolar`; e-mail de suporte e de contato: o seu.
   - Em **Acesso a dados / Escopos**, adicione `.../auth/drive.appdata`.
   - Em **Público-alvo**, clique em **Publicar app** (assim a permissão não expira). Se preferir deixar em *Teste*, adicione os e-mails que vão usar em *Usuários de teste*.
5. Menu **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**:
   - Tipo de aplicativo: **Aplicativo da Web**.
   - Em **Origens JavaScript autorizadas**, clique em *Adicionar URI* e cole o endereço do passo 1 (ex.: `https://financeiro-minhaescola.netlify.app`). Sem barra no final e sem nada depois.
   - Criar. Copie o **ID do cliente** (termina em `.apps.googleusercontent.com`). Esse ID não é segredo.

## 3. Colocar o ID no app

Melhor jeito (vale para todos os aparelhos): abra o arquivo **`config.js`**, cole o ID entre as aspas e **publique de novo** (Netlify: arraste a pasta outra vez; GitHub: edite o arquivo no site).

```js
window.GOOGLE_CLIENT_ID = '123456-abc.apps.googleusercontent.com';
```

Alternativa: em cada aparelho, **Ajustes → Sincronização → ID do cliente Google**, colar e salvar.

---

## 4. Instalar nos aparelhos

**Computador (Windows):** abra o endereço no **Chrome** ou **Edge**. Clique no ícone de instalar na barra de endereço (um monitor com seta) ou menu ⋮ → *Transmitir, salvar e compartilhar → Instalar página como app*. Aparece um ícone na área de trabalho.

**Android:** abra o endereço no **Chrome**, toque em ⋮ → **Instalar app** (ou *Adicionar à tela inicial*). O ícone aparece na tela, e o app abre em tela cheia.

## 5. Primeiro uso

1. No **primeiro aparelho** (de preferência o computador): abra o app → **Já tenho um arquivo de dados (importar)** → escolha `dados-escola.json`.
2. Vá em **Ajustes** e confira: nome da escola, dia de vencimento, multa e juros, valor da mensalidade de cada turma (a turma *Reforço* está com R$ 0,00 — preencha).
3. Em **Ajustes → Sincronização → Entrar com Google e sincronizar**. Aceite o aviso do Google.
4. Nos **outros aparelhos**: abra o app → **Já uso em outro aparelho (entrar com Google)**. Os dados chegam sozinhos.

A partir daí, o app sincroniza sozinho alguns segundos depois de cada alteração (e ao abrir). O ícone no topo mostra o estado: "☁ Sincronizado ✓".

## Dicas

- **Backup:** em *Ajustes → Baixar backup*, baixe um arquivo de vez em quando e guarde no Drive.
- Sem internet o app continua funcionando e envia as alterações quando a conexão voltar.
- Se o Google pedir para entrar de novo, toque no ícone de nuvem no topo.
- Dois aparelhos editando o **mesmo registro** ao mesmo tempo: vale a alteração mais recente. Registros diferentes nunca se sobrepõem.
- Se mudar o endereço do app, adicione o novo endereço nas *Origens JavaScript autorizadas* da credencial e lembre que os dados guardados no aparelho ficam no endereço antigo (a sincronização traz tudo de volta).
