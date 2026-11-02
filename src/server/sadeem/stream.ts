// Reads a streamed chat completion (OpenAI-style server-sent events, as
// OpenRouter sends them) into the same message a non-streamed call returns,
// passing each piece of text on as it arrives so the buyer sees it being written.

interface ToolCallDelta {
  index: number;
  id?: string;
  function?: { name?: string; arguments?: string };
}

/** A reasoning detail as OpenRouter sends it; streamed ones arrive in pieces. */
interface ReasoningDetail {
  type: string;
  index?: number;
  text?: string;
  summary?: string;
  data?: string;
  signature?: string | null;
  [key: string]: unknown;
}

export interface StreamedCompletion {
  message: {
    content: string | null;
    tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
    reasoning_details?: ReasoningDetail[];
  };
  model?: string;
  usage?: { prompt_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };
}

// Pieces of one reasoning detail share its index: their text is concatenated
// and the closing piece carries the signature. Claude needs the whole thing
// back, unchanged, with the tool results.
function mergeReasoning(details: ReasoningDetail[], piece: ReasoningDetail) {
  const same = details.find((d) => d.index === piece.index && d.type === piece.type);
  if (!same) {
    details.push({ ...piece });
    return;
  }
  if (piece.text) same.text = (same.text ?? "") + piece.text;
  if (piece.summary) same.summary = (same.summary ?? "") + piece.summary;
  if (piece.data) same.data = (same.data ?? "") + piece.data;
  if (piece.signature) same.signature = piece.signature;
}

export async function readCompletionStream(res: Response, onText: (delta: string) => void): Promise<StreamedCompletion> {
  if (!res.body) throw new Error("OpenRouter: empty stream");
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let content = "";
  let model: string | undefined;
  let usage: StreamedCompletion["usage"];
  const calls: { id: string; name: string; arguments: string }[] = [];
  const reasoning: ReasoningDetail[] = [];

  const handle = (line: string) => {
    // Blank lines separate events; ": OPENROUTER PROCESSING" keeps the connection alive.
    if (!line.startsWith("data:")) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") return;
    const chunk = JSON.parse(payload);
    if (chunk.error) throw new Error(`OpenRouter stream: ${chunk.error.message ?? JSON.stringify(chunk.error)}`);
    model ??= chunk.model;
    if (chunk.usage) usage = chunk.usage;
    const delta = chunk.choices?.[0]?.delta;
    if (!delta) return;
    if (typeof delta.content === "string" && delta.content) {
      content += delta.content;
      onText(delta.content);
    }
    for (const call of (delta.tool_calls ?? []) as ToolCallDelta[]) {
      const slot = (calls[call.index] ??= { id: "", name: "", arguments: "" });
      if (call.id) slot.id = call.id;
      if (call.function?.name) slot.name += call.function.name;
      if (call.function?.arguments) slot.arguments += call.function.arguments;
    }
    for (const piece of (delta.reasoning_details ?? []) as ReasoningDetail[]) mergeReasoning(reasoning, piece);
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (value) buffer += value;
    const lines = buffer.split("\n");
    buffer = done ? "" : (lines.pop() ?? "");
    for (const line of lines) handle(line.trimEnd());
    if (done) break;
  }

  const toolCalls = calls
    .filter(Boolean)
    .map((call) => ({ id: call.id, type: "function" as const, function: { name: call.name, arguments: call.arguments } }));
  return {
    message: {
      content: content || null,
      tool_calls: toolCalls.length ? toolCalls : undefined,
      reasoning_details: reasoning.length ? reasoning : undefined,
    },
    model,
    usage,
  };
}
