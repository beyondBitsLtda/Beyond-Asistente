/**
 * Pipeline de ingestão.
 *   node --env-file=.env scripts/ingest.mjs
 *
 * Fluxo: carrega fontes → divide em chunks → gera embeddings em lote →
 *        upsert no pgvector (Supabase).
 */

import { loadTrelloDocuments } from "../src/lib/ingest/trello.js";
import { loadBrainDocuments } from "../src/lib/ingest/brain.js";
import { chunkText } from "../src/lib/ingest/chunk.js";
import { embed } from "../src/lib/gemini.js";
import { supabase } from "../src/lib/supabase.js";

const BATCH = 50; // embeddings por chamada

async function main() {
  console.log("→ Carregando fontes...");
  const sources = await Promise.all([
    loadTrelloDocuments(),
    loadBrainDocuments(),
  ]);
  const documents = sources.flat();

  // Expande cada documento em seus chunks
  const rows = [];
  for (const doc of documents) {
    const chunks = chunkText(doc.content);
    chunks.forEach((content, i) => {
      rows.push({
        ...doc,
        id: chunks.length > 1 ? `${doc.id}#${i}` : doc.id,
        content,
      });
    });
  }

  if (!rows.length) {
    console.log("Nada para indexar. Verifique .env e as fontes.");
    return;
  }
  console.log(`→ ${rows.length} chunks a embeddar.`);

  // Embedda e faz upsert em lotes
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const vectors = await embed(
      batch.map((r) => r.content),
      "RETRIEVAL_DOCUMENT"
    );

    const payload = batch.map((r, j) => ({
      id: r.id,
      source: r.source,
      board: r.board,
      title: r.title,
      content: r.content,
      url: r.url,
      last_modified: r.last_modified,
      metadata: r.metadata || {},
      embedding: vectors[j],
    }));

    const { error } = await supabase.from("documents").upsert(payload);
    if (error) throw new Error(`upsert falhou: ${error.message}`);

    console.log(`   ✓ ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }

  console.log("✅ Ingestão concluída.");
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
