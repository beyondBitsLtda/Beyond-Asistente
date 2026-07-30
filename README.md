# Beyond Bits — cérebro (Fases 1–3)

Base de código do **cérebro** do assistente: embeddings + busca semântica (pgvector) + resposta do Gemini em streaming, com ingestão de Trello e do Beyond Brain. Ainda **sem voz e sem HUD real** — isso é de propósito (construção de dentro pra fora).

## O que já está pronto aqui

- `db/schema.sql` — tabela `documents` com `vector(768)` e a função `match_documents`.
- `src/lib/gemini.js` — embeddings (`gemini-embedding-001` @ 768d) e chat streaming (`gemini-2.5-flash`).
- `src/lib/rag.js` — busca por similaridade + montagem do prompt.
- `src/app/api/ask/route.js` — endpoint `POST /api/ask` que responde via SSE (`context`, `token`, `done`).
- `src/lib/ingest/` — loaders do Trello (API) e do Brain (stub + fallback de notas `.md`) + chunking.
- `scripts/ingest.mjs` — indexa tudo no pgvector.
- `scripts/ask.mjs` — testa o cérebro pela linha de comando.

## Setup

1. **Instalar**
   ```bash
   npm install
   ```
2. **Configurar chaves**
   ```bash
   cp .env.example .env
   # preencha GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TRELLO_KEY, TRELLO_TOKEN
   ```
3. **Criar o schema** — cole o conteúdo de `db/schema.sql` no SQL Editor do Supabase e rode.
4. **Indexar seus dados**
   ```bash
   npm run ingest
   ```
5. **Testar o cérebro (sem voz)**
   ```bash
   npm run ask "quais clientes do CRM mudaram hoje?"
   ```
6. **Subir a API** (opcional agora)
   ```bash
   npm run dev
   # POST http://localhost:3000/api/ask  { "question": "..." }
   ```

## O que ainda depende de você

- **Chaves reais** (Gemini, Supabase, Trello) — sem elas nada conecta.
- **Código do Beyond Brain** — hoje há um *stub* em `src/lib/ingest/brain.js` que lê notas `.md`. Quando você anexar o app do cérebro, implemente ali a leitura da fonte real.
- **Prints dos boards do Trello** — para ajustar quais boards/colunas entram na indexação.

## Próximas fases (ainda não neste código)

- **Fase 4 — Voz:** wake word "Beyond" (Picovoice Porcupine), STT e TTS.
- **Fase 5 — HUD real:** ligar o `Beyond_Bits_HUD` ao `/api/ask` (o SSE já emite `context` → cards e `token` → transcript), waveform reativo ao microfone, logs e status reais.
- **Fase 6 — Produção:** autenticação, deploy (Vercel + Supabase), ajuste de `top_k`/limiar/prompt e plano de testes.

## Nota sobre modelos

Nomes de modelos do Gemini mudam com frequência. Estão em variáveis de ambiente
(`GEMINI_CHAT_MODEL`, `GEMINI_EMBED_MODEL`) — confira os atuais em ai.google.dev antes de ir para produção.
