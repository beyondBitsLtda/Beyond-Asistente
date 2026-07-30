import { retrieve, buildPrompt, SYSTEM_INSTRUCTION } from "@/lib/rag.js";
import { chatStream } from "@/lib/gemini.js";

export const runtime = "nodejs";

/**
 * POST /api/ask
 * body: { question: string, filterSource?: 'trello' | 'brain' }
 *
 * Responde via SSE (Server-Sent Events) com três tipos de evento,
 * que mapeiam direto para o HUD:
 *   - "context": os cards recuperados (coluna RETRIEVED_CONTEXT)
 *   - "token":   pedaços da resposta (linha de transcript, estado SPEAKING)
 *   - "done":    fim do stream
 */
export async function POST(req) {
  const { question, filterSource = null } = await req.json();

  if (!question || typeof question !== "string") {
    return new Response(JSON.stringify({ error: "question é obrigatório" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const send = (controller, event, data) =>
    controller.enqueue(
      encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    );

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1) Recuperar contexto
        const matches = await retrieve(question, { filterSource });
        send(controller, "context", matches);

        // 2) Montar prompt e transmitir a resposta do Gemini
        const prompt = buildPrompt(question, matches);
        for await (const piece of chatStream(prompt, SYSTEM_INSTRUCTION)) {
          send(controller, "token", piece);
        }

        send(controller, "done", { ok: true });
      } catch (err) {
        send(controller, "error", { message: String(err?.message || err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
