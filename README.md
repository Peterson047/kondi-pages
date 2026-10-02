# 🧾 Kondi Pages — Scanner e Exportador de Nota Fiscal Paulista

<div align="center">

<img src="./public/logo-mobile.svg" width="80" height="80" alt="Kondi Logo">

### **Seu contrato com o controle de gastos — 100% no navegador**

[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-blue?logo=github)](https://peterson047.github.io/kondi-pages)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vite.dev)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## ✨ O que é o Kondi Pages?

**Kondi Pages** é uma versão ultraleve, moderna e estática do **Kondi** projetada especificamente para rodar no **GitHub Pages**, **sem necessidade de login, servidor Node.js ou banco de dados externo**.

Você aponta a câmera para o QR Code da sua **Nota Fiscal Paulista (NFC-e)** ou cola o link/código da SEFAZ, e o app monta imediatamente um **Recibo Digital Inteligente**, permitindo exportar todos os itens da compra em:
* 📄 **Texto (.txt)**: Formatação clássica de cupom fiscal em largura fixa (monoespaçado).
* 📝 **Markdown (.md)**: Tabela limpa com dados fiscais pronta para Notion ou Obsidian.
* 📊 **Planilha Excel (.csv)**: CSV codificado com BOM UTF-8 e separador de ponto e vírgula (`;`), abrindo diretamente com colunas perfeitas no Microsoft Excel e Google Sheets.

---

## 🎨 System Design em Nota (Kondi Paper UI)

A interface do Kondi Pages foi concebida com o conceito de **"System Design em Nota"**:
* O elemento principal é um **recibo digital tátil** com estética inspirada no design macOS combinado com papel térmico estilizado (divisor serrilhado, acabamento em curvas suaves, cores oficiais do Kondi com laranja `#F97316`).
* Identificação automática de categorias para cada produto (Alimentação, Limpeza, Saúde, Transporte, etc.) com badges coloridos.
* Barra de ferramentas de exportação integrada ao topo do próprio recibo.
* Chave de acesso de 44 dígitos com agrupamento para fácil leitura e código de barras decorativo.
* Suporte nativo a **Dark Mode** e **Light Mode** com persistência.

---

## 🔒 100% Privado e Seguro

* **Sem Login**: Não requer cadastro, senhas ou e-mails.
* **Dados Locais**: Todo o histórico e notas fiscais são armazenados exclusivamente no `localStorage` do seu navegador.
* **Zero Rastreamento**: Nenhuma informação da sua nota fiscal sai do seu dispositivo.

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
* Node.js 18+ (recomendado Node 20+)
* npm

### Instalação e Execução

```bash
# 1. Clone ou entre na pasta
cd kondi-pages

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173) no seu navegador.

---

## 📦 Como Ativar o Deploy no GitHub Pages

Este repositório já inclui um fluxo de automação pronto em [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

Para ativar no GitHub:
1. Suba o código para o seu repositório no GitHub.
2. Acesse **Settings** > **Pages** no seu repositório.
3. Em **Build and deployment** > **Source**, selecione **GitHub Actions**.
4. Faça um push para a branch `main`.
5. Pronto! O site será publicado automaticamente no endereço: `https://<seu-usuario>.github.io/<nome-do-repo>`.

---

## 📄 Licença

Distribuído sob a licença MIT. Feito com 💜 no Brasil.
