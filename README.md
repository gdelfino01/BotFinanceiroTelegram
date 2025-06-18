# 🤖 Bot Financeiro para Telegram com Google Sheets

Este é um bot para Telegram projetado para ajudar no controle financeiro pessoal de forma rápida e intuitiva. Ele se conecta a uma planilha do Google Sheets que serve como banco de dados, permitindo registrar despesas e receitas através de uma conversa guiada e visualizar resumos financeiros diretamente no chat.

![Exemplo de uso do Bot](https://i.imgur.com/u7aW08m.gif)
*(Este é um GIF de exemplo de como a interação com o bot funciona)*

---

## ✨ Funcionalidades

- **Fluxo de Conversa Guiado:** Adicione novos gastos e receitas através de um passo a passo simples, sem precisar memorizar comandos complexos.
- **Interface com Botões:** Selecione categorias e contas usando botões inline do Telegram, minimizando erros de digitação.
- **Banco de Dados no Google Sheets:** Todos os seus dados são armazenados de forma segura e organizada em uma planilha Google que só você pode acessar.
- **Configuração Dinâmica:** As categorias de despesas, receitas e as contas/métodos de pagamento são carregadas diretamente da sua planilha.
- **Relatórios Instantâneos:**
  - `/resumo`: Exibe o balanço total de receitas e despesas.
  - `/ultimos <N>`: Lista os seus últimos `N` lançamentos financeiros (o padrão é 5).
- **Dashboard na Planilha:** O projeto é desenhado para alimentar um dashboard visual na própria planilha, com gráficos e resumos mensais.

---

## 🔧 Como Configurar e Rodar o Projeto

Siga estes passos para ter o bot funcionando no seu ambiente.

### 1. Preparar a Planilha Google

1.  Crie uma nova planilha no [Google Sheets](https://sheets.google.com).
2.  Crie 3 abas (páginas) com os seguintes nomes exatos:
    - `Lançamentos`
    - `Dashboard`
    - `Configurações`
3.  Na aba `Lançamentos`, adicione os seguintes cabeçalhos na primeira linha:
    `Data`, `Descrição`, `Categoria`, `Valor`, `Tipo`, `Conta/Método`, `Obs`
4.  Na aba `Configurações`, adicione os seguintes cabeçalhos:
    - Em **A1**: `Categorias de Despesa`
    - Em **B1**: `Categorias de Receita`
    - Em **C1**: `Contas/Métodos`
    - Preencha com suas categorias e contas para que o bot possa lê-las.

### 2. Configurar a API do Google

1.  Acesse o [Google Cloud Console](https://console.cloud.google.com/) e crie um novo projeto.
2.  Ative a **API do Google Sheets** para este projeto.
3.  Crie uma **Conta de Serviço (Service Account)**.
4.  Gere uma chave JSON para esta conta de serviço. O download de um arquivo será feito. Renomeie este arquivo para `credentials.json` e coloque-o na raiz do projeto do bot.
5.  Copie o email da conta de serviço (algo como `nome-do-bot@...iam.gserviceaccount.com`).
6.  Volte para a sua Planilha Google, clique em "Compartilhar" e adicione o email da conta de serviço, dando permissão de **Editor**.

### 3. Configurar o Bot do Telegram

1.  Converse com o [@BotFather](https://t.me/BotFather) no Telegram.
2.  Use o comando `/newbot` para criar um novo bot.
3.  O BotFather fornecerá um **token de acesso**. Guarde-o.

### 4. Rodar o Projeto Localmente

1.  Clone este repositório:
    ```bash
    git clone <url-do-seu-repositorio>
    cd <pasta-do-repositorio>
    ```
2.  Instale as dependências:
    ```bash
    npm install
    ```
3.  Crie um arquivo chamado `.env` na raiz do projeto.
4.  Adicione as seguintes variáveis a ele:
    ```env
    # Token que você pegou do BotFather
    TELEGRAM_TOKEN=SEU_TELEGRAM_TOKEN_AQUI

    # O ID da sua Planilha Google. Você o encontra na URL:
    # [https://docs.google.com/spreadsheets/d/ESTE_EH_O_ID/edit](https://docs.google.com/spreadsheets/d/ESTE_EH_O_ID/edit)
    SHEET_ID=SEU_SHEET_ID_AQUI
    ```
5.  Certifique-se que o arquivo `credentials.json` está na pasta.
6.  Inicie o bot:
    ```bash
    npm start
    ```

Se tudo estiver correto, você verá a mensagem "🤖 Bot iniciado com sucesso!" no seu terminal.

---

## 🚀 Como Usar o Bot

Abra a conversa com seu bot no Telegram e digite `/start` ou `/ajuda`.

O menu principal aparecerá com botões:

- **💸 Novo Gasto**: Inicia o fluxo para registrar uma despesa. O bot perguntará o valor, a categoria (com botões de opção) e a conta.
- **💰 Nova Receita**: Mesmo fluxo, mas para registrar uma entrada de dinheiro.
- **📊 Ver Resumo**: Mostra o total de receitas, despesas e o saldo geral.
- **🧾 Ver Últimos 5**: Lista os últimos 5 lançamentos que você fez.

---

## 📁 Estrutura do Projeto

```
.
├── 📄 .env                   # Arquivo de variáveis de ambiente (local)
├── 📄 .gitignore              # Ignora arquivos sensíveis e desnecessários
├── 📄 credentials.json       # Chave da API do Google (local)
├── 📄 index.js                # Ponto de entrada, inicializa o bot e os listeners
├── 📄 handlers.js             # Centraliza o tratamento de mensagens e botões
├── 📄 conversation.js        # Gerencia a lógica do fluxo de conversa
├── 📄 ui.js                   # Constrói as mensagens e os teclados de botões
├── 📄 sheets.js               # Camada de acesso à Planilha Google
├── 📄 package.json            # Dependências e scripts do projeto
└── 📄 README.md               # Este arquivo
```