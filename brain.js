/**
 * Ingestão do "Beyond Brain" (cérebro digital).
 *
 * >>> PONTO DE INTEGRAÇÃO <<<
 * Quando você anexar o código do app do cérebro, implemente aqui a leitura
 * da fonte real (banco próprio, API, arquivos, etc.) e devolva o mesmo
 * formato de documento usado no resto do pipeline.
 *
 * Enquanto isso, o fallback abaixo lê notas .md de uma pasta (BRAIN_NOTES_DIR),
 * o que já deixa o RAG funcionando com seus estudos/anotações.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { join, extname, basename } from "node:path";

const NOTES_DIR = process.env.BRAIN_NOTES_DIR || "./brain-notes";

export async function loadBrainDocuments() {
  // TODO: substituir por leitura da fonte real do Beyond Brain.
  return loadMarkdownNotes(NOTES_DIR);
}

/** Fallback: lê recursivamente arquivos .md/.txt de uma pasta. */
async function loadMarkdownNotes(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    console.warn(`[brain] pasta "${dir}" não encontrada — pulando Brain.`);
    return [];
  }

  const docs = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      docs.push(...(await loadMarkdownNotes(full)));
      continue;
    }
    if (![".md", ".txt"].includes(extname(entry.name).toLowerCase())) continue;

    const content = await readFile(full, "utf8");
    const info = await stat(full);
    docs.push({
      id: `brain:${full}`,
      source: "brain",
      board: "Beyond Brain",
      title: basename(entry.name).replace(/\.(md|txt)$/i, ""),
      content,
      url: null,
      last_modified: info.mtime.toISOString(),
      metadata: { path: full },
    });
  }

  console.log(`[brain] ${docs.length} notas carregadas de "${dir}".`);
  return docs;
}
