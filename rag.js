import { supabase } from "./supabase.js";
import { embedOne } from "./gemini.js";

const TOP_K = Number(process.env.RAG_TOP_K || 5);
const MIN_SIM = Number(process.env.RAG_MIN_SIMILARITY || 0.55);

/**
 * Busca os trechos mais relevantes para uma pergunta.
 * filterSource: 'trello' | 'brain' | null (todas as fontes)
 */
export async function retrieve(question, { topK = TOP_K, filterSource = null } = {}) {
  const queryEmbedding = await embedOne(question, "RETRIEVAL_QUERY");

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_count: topK,
    filter_source: filterSource,
  });

  if (error) throw new Error(`match_documents falhou: ${error.message}`);

  // Filtra ruído abaixo do limiar de similaridade.
  return (data || []).filter((d) => d.similarity >= MIN_SIM);
}

/** Monta o prompt com o contexto recuperado. */
export function buildPrompt(question, matches) {
  const contexto = matches
    .map((m, i) => {
      const quando = m.last_modified
        ? new Date(m.last_modified).toLocaleString("pt-BR")
        : "sem data";
      return `[${i + 1}] (${m.source}/${m.board || "-"} · alterado ${quando})
Título: ${m.title || "-"}
Conteúdo: ${m.content}`;
    })
    .join("\n\n");

  return `Contexto recuperado dos quadros e notas do usuário:

${contexto || "(nenhum trecho relevante encontrado)"}

Pergunta do usuário: ${question}`;
}

export const SYSTEM_INSTRUCTION = `Você é o Beyond Bits, um assistente pessoal em português (pt-BR).
Responda de forma objetiva e falada (o texto será lido em voz alta).
Use SOMENTE o contexto fornecido. Se a resposta não estiver no contexto, diga que não encontrou.
Quando fizer sentido, priorize itens alterados mais recentemente.`;
