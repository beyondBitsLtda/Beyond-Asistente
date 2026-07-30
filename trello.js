/**
 * Ingestão do Trello.
 * Busca boards → cards e normaliza cada card num "documento" para indexar.
 *
 * Ajuste o mapeamento quando os prints dos seus boards chegarem
 * (quais boards entram, quais colunas ignorar, etc.).
 */

const KEY = process.env.TRELLO_KEY;
const TOKEN = process.env.TRELLO_TOKEN;
const BASE = "https://api.trello.com/1";

function auth(params = {}) {
  return new URLSearchParams({ key: KEY, token: TOKEN, ...params }).toString();
}

async function api(path, params) {
  const res = await fetch(`${BASE}${path}?${auth(params)}`);
  if (!res.ok) throw new Error(`Trello ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

/** Retorna documentos normalizados a partir dos boards do usuário. */
export async function loadTrelloDocuments() {
  if (!KEY || !TOKEN) {
    console.warn("[trello] TRELLO_KEY/TOKEN ausentes — pulando Trello.");
    return [];
  }

  const filterIds = (process.env.TRELLO_BOARD_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let boards = await api("/members/me/boards", { fields: "name" });
  if (filterIds.length) boards = boards.filter((b) => filterIds.includes(b.id));

  const docs = [];
  for (const board of boards) {
    // Mapa de listId → nome da coluna
    const lists = await api(`/boards/${board.id}/lists`, { fields: "name" });
    const listName = Object.fromEntries(lists.map((l) => [l.id, l.name]));

    const cards = await api(`/boards/${board.id}/cards`, {
      fields: "name,desc,idList,dateLastActivity,shortUrl",
    });

    for (const c of cards) {
      const coluna = listName[c.idList] || "";
      const content = [c.name, coluna && `Coluna: ${coluna}`, c.desc]
        .filter(Boolean)
        .join("\n");

      docs.push({
        id: `trello:${c.id}`,
        source: "trello",
        board: board.name,
        title: c.name,
        content,
        url: c.shortUrl,
        last_modified: c.dateLastActivity,
        metadata: { column: coluna, cardId: c.id },
      });
    }
  }

  console.log(`[trello] ${docs.length} cards carregados de ${boards.length} boards.`);
  return docs;
}
