/**
 * Teste do cérebro pela linha de comando (sem HUD, sem voz).
 *   node --env-file=.env scripts/ask.mjs "quais clientes do CRM mudaram hoje?"
 *
 * Serve para validar a Fase 1–3 antes de investir em voz e interface.
 */

import { retrieve, buildPrompt, SYSTEM_INSTRUCTION } from "../src/lib/rag.js";
import { chatStream } from "../src/lib/gemini.js";

const question = process.argv.slice(2).join(" ").trim();
if (!question) {
  console.error('Uso: node --env-file=.env scripts/ask.mjs "sua pergunta"');
  process.exit(1);
}

const matches = await retrieve(question);

console.log(`\n🔎 Contexto recuperado (${matches.length}):`);
for (const m of matches) {
  console.log(`  • [${m.similarity.toFixed(2)}] ${m.source}/${m.board} — ${m.title}`);
}

console.log("\n💬 Resposta:\n");
const prompt = buildPrompt(question, matches);
for await (const piece of chatStream(prompt, SYSTEM_INSTRUCTION)) {
  process.stdout.write(piece);
}
console.log("\n");
