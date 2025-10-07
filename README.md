# 🧩 Atividade 01: STT (Áudio → Texto) e TTS (Texto → Áudio) com App React Native + Expo + Backend

Você vai pesquisar, escolher e integrar uma IA (pode ser um serviço de API pronto ou um backend próprio em qualquer linguagem) capaz de:

- Receber áudio do app mobile (React Native + Expo + TypeScript) e retornar texto (STT).
- Receber texto do app e retornar áudio sintetizado (TTS).

# 🧩 Atividade 02: Integração Claude AI com Aplicativo React Native (via Backend Seguro)

## 🎯 Objetivo Geral

Implementar uma funcionalidade de **chat inteligente** em um aplicativo **React Native (Expo + TypeScript)**, que se comunique com o modelo **Claude (Anthropic)** por meio de um **backend Node.js + Express** seguro.  
A meta é permitir que o usuário envie mensagens, receba respostas em linguagem natural e visualize a conversa em uma interface simples e responsiva.

---

## 🧠 Contexto

A Anthropic oferece o **Claude API**, um modelo de IA avançado similar ao ChatGPT.  
Por questões de segurança e boas práticas, a chave da API **não deve ser exposta** diretamente no aplicativo — ela deve ser protegida no **servidor backend**, que atuará como intermediário entre o app e a Anthropic.

O projeto servirá como base para futuras funcionalidades, como:

- Assistente de escrita, tradução e resumo de textos.
- Chat multimodal (voz, imagem, vídeo).
- Ferramentas integradas (busca, geração de texto, agentes inteligentes).

---

## 🧱 Escopo da Tarefa

### 1. Backend (Node.js + Express)

- Criar um **servidor Express** que exponha um endpoint `POST /api/claude/chat`.
- Esse endpoint receberá mensagens do app e fará uma requisição à API do Claude, retornando a resposta de forma estruturada.
- Armazenar a chave da API da Anthropic no `.env`, **sem commit** no repositório.
- Validar entradas (mensagens, papéis, número máximo de tokens) antes de chamar a API.
- Configurar **CORS** para permitir requisições do app em desenvolvimento.
- Implementar rota `GET /healthz` para monitoramento simples.

### 2. Aplicativo React Native (Expo + TypeScript)

- Criar tela de **chat** com:
  - Lista de mensagens enviadas e recebidas.
  - Campo de texto para entrada do usuário.
  - Botão “Enviar” funcional.
- Mostrar imediatamente a mensagem do usuário ao enviar (antes da resposta).
- Chamar o endpoint do backend via `fetch` ou `axios`.
- Exibir o texto retornado pelo modelo Claude na conversa.
- Mostrar **estado de carregamento** (spinner ou placeholder).
- Tratar erros (ex: sem conexão, resposta inválida).
- Layout responsivo e compatível com iOS/Android.

---

## ⚙️ Requisitos Técnicos

### Backend

- Node.js (>=18)
- Express.js
- @anthropic-ai/sdk
- CORS, dotenv, zod (validação)
- Estrutura modular com rotas e middlewares

### Frontend (App)

- Expo SDK >= 51 (React Native + TypeScript)
- Axios (ou fetch nativo)
- Async/Await para chamadas assíncronas
- Interface simples (View, TextInput, TouchableOpacity, FlatList)
- Estilos com `StyleSheet` ou Tailwind RN (opcional)

---

## 📋 Critérios de Aceitação

1. O usuário consegue digitar uma mensagem e pressionar **Enviar**.
2. A mensagem do usuário aparece imediatamente no chat.
3. Após alguns segundos, aparece a resposta gerada pelo Claude.
4. Se ocorrer erro de rede, o app mostra uma mensagem amigável.
5. A chave da API da Anthropic **não** aparece em nenhum arquivo do app.
6. O backend responde corretamente a um `POST /api/claude/chat` com JSON válido.
7. A comunicação funciona em rede local (Expo + servidor rodando na mesma LAN).

---

## 🧩 Estrutura Recomendada do Projeto

```
📂 backend/
 ├── server.js
 ├── routes/
 │    └── claude.routes.js
 ├── .env
 └── package.json

📂 app/
 ├── App.tsx
 ├── src/
 │    ├── api.ts
 │    ├── components/
 │    │     └── ChatBubble.tsx
 │    └── screens/
 │          └── ChatScreen.tsx
 ├── .env
 └── app.json
```

---

## 🧮 Fluxo de Funcionamento

1. O app envia uma requisição `POST` para o backend:
   - Corpo contém lista de mensagens (`role`, `content`).
2. O backend repassa essas mensagens à API do Claude usando o SDK oficial.
3. Claude retorna a resposta processada em JSON.
4. O backend extrai o texto e devolve ao app.
5. O app exibe a mensagem de resposta na tela do usuário.

---

## 🧰 Tarefas Detalhadas

### Etapa 1 — Configuração do Backend

- [ ] Criar pasta do backend e inicializar projeto Node (`npm init`).
- [ ] Instalar dependências (`express`, `dotenv`, `cors`, `@anthropic-ai/sdk`, `zod`).
- [ ] Configurar servidor básico em `server.js`.
- [ ] Criar rota `/api/claude/chat` para enviar e receber mensagens.
- [ ] Testar com `curl` ou `Postman`.
- [ ] Adicionar tratamento de erros e logs básicos.

### Etapa 2 — Criação do App React Native

- [ ] Criar app com `npx create-expo-app` (template TypeScript).
- [ ] Adicionar biblioteca HTTP (`axios`).
- [ ] Configurar `.env` com `EXPO_PUBLIC_API_BASE`.
- [ ] Criar tela com lista de mensagens e campo de envio.
- [ ] Implementar lógica de envio de mensagens (`sendToClaude()`).
- [ ] Exibir estado de carregamento.
- [ ] Tratar erros e respostas vazias.

### Etapa 3 — Testes e Integração

- [ ] Executar backend localmente (`npm run dev`).
- [ ] Executar app no Expo Go no mesmo Wi-Fi.
- [ ] Testar fluxo completo (enviar/receber mensagens).
- [ ] Validar logs no console do servidor.
- [ ] Simular desconexões e observar comportamento.

---

## 🚀 Extensões Futuras (Opcional)

- **Streaming de resposta** (exibir texto em tempo real).
- **Persistência local** (AsyncStorage para histórico).
- **Autenticação de usuário** (JWT no backend).
- **Modos de uso**: tradutor, resumidor, explicador.
- **Interface de voz** (STT/TTS com microfone e sintetização).

---
