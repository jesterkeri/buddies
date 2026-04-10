/**
 * Compatibility patch for non-OpenAI providers via OpenAI-compatible endpoints.
 *
 * Problem: Vercel AI SDK v3 (@ai-sdk/openai v2.x) defaults to OpenAI's Responses API
 * (/responses endpoint). Non-OpenAI providers (Google Gemini, Groq, etc.) only support
 * the Chat Completions API (/chat/completions), returning 404 "Not Found".
 *
 * Fix: Intercept fetch requests to non-OpenAI hosts, redirect /responses to
 * /chat/completions, transform request body (Responses→Chat format), and transform
 * the response back (Chat→Responses format) so the AI SDK can parse it.
 *
 * Streaming case: when the AI SDK calls doStream(), the body has stream:true. We
 * pass it through to Google's chat/completions endpoint, which streams back legacy
 * chat.completion.chunk SSE events. The AI SDK's openaiResponsesChunkSchema can't
 * parse those, so we live-transform the upstream stream into Responses-API events
 * (response.created → response.output_item.added → response.output_text.delta* →
 * response.output_item.done → response.completed/incomplete) on the fly.
 *
 * Also strips frequency_penalty, presence_penalty, and other unsupported params.
 */

// Hosts that handle /responses natively — don't patch these
const NATIVE_HOSTS = new Set(['api.openai.com', 'localhost', '127.0.0.1']);
const STRIP_PARAMS = ['frequency_penalty', 'presence_penalty', 'logprobs', 'top_logprobs', 'logit_bias'];
const encoder = new TextEncoder();

function isNonOpenAI(url: string): boolean {
  // Parse the URL and compare hostnames exactly. Substring `includes()` would
  // wrongly treat `https://api.openai.com.evil.com/...` as native, suppressing
  // both the patch and the embedding safety net for an attacker-controlled host.
  try {
    const hostname = new URL(url).hostname;
    return !NATIVE_HOSTS.has(hostname);
  } catch {
    // Malformed URL — be conservative and treat as non-OpenAI so we still strip params.
    return true;
  }
}

function toSseChunk(payload: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

function buildResponseUsage(usage?: any) {
  return {
    input_tokens: usage?.prompt_tokens ?? 0,
    input_tokens_details: usage?.prompt_tokens_details
      ? { cached_tokens: usage.prompt_tokens_details.cached_tokens ?? undefined }
      : undefined,
    output_tokens: usage?.completion_tokens ?? 0,
    output_tokens_details: usage?.completion_tokens_details
      ? { reasoning_tokens: usage.completion_tokens_details.reasoning_tokens ?? undefined }
      : undefined,
  };
}

function mapChatFinishReasonToResponsesEvent(finishReason?: string | null) {
  switch (finishReason) {
    case 'length':
      return { type: 'response.incomplete', incomplete_details: { reason: 'max_output_tokens' } };
    case 'content_filter':
      return { type: 'response.incomplete', incomplete_details: { reason: 'content_filter' } };
    default:
      return { type: 'response.completed', incomplete_details: undefined };
  }
}

function extractMessageText(content: any): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part?.type === 'text' || part?.type === 'output_text') return part.text || '';
        return '';
      })
      .join('');
  }
  return '';
}

function transformChatStreamToResponses(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'text/event-stream; charset=utf-8');
  headers.delete('Content-Length');

  let buffer = '';
  let responseId = `resp_${Date.now()}`;
  let createdAt = Math.floor(Date.now() / 1000);
  let model = 'unknown';
  let itemId = `msg_${responseId}_0`;
  let usage: any;
  let started = false;
  let finished = false;

  const emitStart = (controller: TransformStreamDefaultController<Uint8Array>) => {
    if (started) return;
    started = true;
    controller.enqueue(
      toSseChunk({
        type: 'response.created',
        response: {
          id: responseId,
          created_at: createdAt,
          model,
        },
      })
    );
    controller.enqueue(
      toSseChunk({
        type: 'response.output_item.added',
        output_index: 0,
        item: {
          type: 'message',
          id: itemId,
        },
      })
    );
  };

  const emitFinish = (
    controller: TransformStreamDefaultController<Uint8Array>,
    finishReason?: string | null
  ) => {
    if (finished) return;
    emitStart(controller);
    finished = true;

    controller.enqueue(
      toSseChunk({
        type: 'response.output_item.done',
        output_index: 0,
        item: {
          type: 'message',
          id: itemId,
        },
      })
    );

    const mapped = mapChatFinishReasonToResponsesEvent(finishReason);
    controller.enqueue(
      toSseChunk({
        type: mapped.type,
        response: {
          incomplete_details: mapped.incomplete_details,
          usage: buildResponseUsage(usage),
        },
      })
    );
  };

  // Process one raw SSE event (the text between two `\n\n` separators). Used by
  // both `transform` (one event at a time as separators arrive) and `flush` (to
  // drain any final un-terminated event before emitFinish runs).
  const processEvent = (
    rawEvent: string,
    controller: TransformStreamDefaultController<Uint8Array>
  ) => {
    const data = rawEvent
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');

    if (!data || data === '[DONE]') return;

    try {
      const parsed = JSON.parse(data);
      responseId = parsed.id || responseId;
      createdAt = typeof parsed.created === 'number' ? parsed.created : createdAt;
      model = typeof parsed.model === 'string' ? parsed.model : model;
      itemId = `msg_${responseId}_0`;

      emitStart(controller);

      if (parsed.usage) {
        usage = parsed.usage;
      }

      const choice = Array.isArray(parsed.choices) ? parsed.choices[0] : undefined;
      const deltaText = choice?.delta?.content;
      if (typeof deltaText === 'string' && deltaText.length > 0) {
        controller.enqueue(
          toSseChunk({
            type: 'response.output_text.delta',
            item_id: itemId,
            delta: deltaText,
          })
        );
      }

      if (choice?.finish_reason != null) {
        emitFinish(controller, choice.finish_reason);
      }
    } catch {
      // Ignore malformed chunks and keep the underlying stream flowing.
    }
  };

  const transformedBody = response.body?.pipeThrough(new TextDecoderStream()).pipeThrough(
    new TransformStream<string, Uint8Array>({
      transform(chunk, controller) {
        buffer += chunk;

        while (true) {
          const match = buffer.match(/\r?\n\r?\n/);
          if (!match || match.index == null) break;

          const rawEvent = buffer.slice(0, match.index);
          buffer = buffer.slice(match.index + match[0].length);
          processEvent(rawEvent, controller);
        }
      },
      flush(controller) {
        // Drain any remaining buffered event that didn't have a terminating \n\n.
        // SSE servers are supposed to terminate events properly, but if the upstream
        // closes the connection mid-event we still want to emit whatever delta we got.
        if (buffer.length > 0) {
          processEvent(buffer, controller);
          buffer = '';
        }
        emitFinish(controller);
      },
    })
  );

  return new Response(transformedBody, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const originalFetch = globalThis.fetch;

globalThis.fetch = async function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  let redirected = false;
  let redirectedStream = false;

  try {
    if (isNonOpenAI(url) && init?.method === 'POST' && init?.body) {
      const bodyStr = typeof init.body === 'string' ? init.body : undefined;

      // Redirect /responses → /chat/completions
      if (url.endsWith('/responses') && bodyStr) {
        redirected = true;
        url = url.replace(/\/responses$/, '/chat/completions');
        input = url;

        const parsed = JSON.parse(bodyStr);
        redirectedStream = parsed.stream === true;

        // Transform Responses API request → Chat Completions request
        const messages: any[] = [];

        // System instructions
        if (parsed.instructions) {
          messages.push({ role: 'system', content: parsed.instructions });
        }

        // Convert input array to messages
        if (parsed.input) {
          for (const msg of parsed.input) {
            const role = msg.role === 'developer' ? 'system' : (msg.role || 'user');
            let content: any;

            if (Array.isArray(msg.content)) {
              const parts = msg.content.map((c: any) => {
                if (c.type === 'input_text' || c.type === 'output_text') return { type: 'text', text: c.text };
                return c;
              });
              content = parts.length === 1 && parts[0].type === 'text' ? parts[0].text : parts;
            } else {
              content = msg.content;
            }

            messages.push({ role, content });
          }
        }

        const chatBody: any = {
          model: parsed.model,
          messages,
        };

        // Copy compatible params
        if (parsed.temperature !== undefined) chatBody.temperature = parsed.temperature;
        if (parsed.top_p !== undefined) chatBody.top_p = parsed.top_p;
        if (parsed.max_output_tokens) chatBody.max_tokens = parsed.max_output_tokens;
        if (parsed.stop) chatBody.stop = parsed.stop;
        if (parsed.stream !== undefined) chatBody.stream = parsed.stream;

        // Strip unsupported params
        for (const param of STRIP_PARAMS) delete chatBody[param];

        init = { ...init, body: JSON.stringify(chatBody) };
      } else if (bodyStr) {
        // For non-redirect POSTs (embeddings, etc.), just strip params
        const parsed = JSON.parse(bodyStr);
        let modified = false;
        for (const param of STRIP_PARAMS) {
          if (param in parsed) { delete parsed[param]; modified = true; }
        }
        if (modified) init = { ...init, body: JSON.stringify(parsed) };
      }
    }
  } catch {
    // Don't break fetch if patching fails
  }

  const response = await originalFetch.call(globalThis, input, init);

  // Safety net: if an embedding call fails on a non-OpenAI provider, return a zero vector
  // instead of crashing the message pipeline. RAG degrades gracefully (no similarity matches)
  // but the agent still responds.
  const urlStr = typeof input === 'string' ? input : url;
  if (!response.ok && isNonOpenAI(urlStr) && urlStr.includes('/embeddings')) {
    try {
      const bodyStr = typeof init?.body === 'string' ? init.body : '';
      const parsed = bodyStr ? JSON.parse(bodyStr) : {};
      const dim = 3072; // default to Google's embedding dimension
      const zeroVector = Array(dim).fill(0);
      zeroVector[0] = 0.001; // tiny non-zero to avoid NaN in cosine similarity
      return new Response(JSON.stringify({
        object: 'list',
        data: [{ object: 'embedding', index: 0, embedding: zeroVector }],
        model: parsed.model || 'fallback',
        usage: { prompt_tokens: 0, total_tokens: 0 },
      }), {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // If safety net itself fails, return original error
    }
  }

  // Transform Chat Completions response → Responses API response.
  // CRITICAL: clone the response BEFORE consuming the body so we can return
  // the original on transform failure. response.json() consumes the stream.
  if (redirected && response.ok) {
    if (redirectedStream) {
      return transformChatStreamToResponses(response);
    }

    let bodyText = '';
    try {
      // Buffer the body once so we can either reuse it on failure or transform it
      bodyText = await response.text();
      const data = JSON.parse(bodyText);
      if (data.choices) {
        const output = data.choices.map((c: any, i: number) => ({
          id: `msg_${data.id || Date.now()}_${i}`,
          type: 'message',
          role: c.message?.role || 'assistant',
          content: [{ type: 'output_text', text: extractMessageText(c.message?.content), annotations: [] }],
        }));
        const transformed = {
          id: data.id || `resp_${Date.now()}`,
          object: 'response',
          created_at: Math.floor(data.created || Date.now() / 1000),
          model: data.model,
          output,
          usage: data.usage ? {
            input_tokens: data.usage.prompt_tokens || 0,
            output_tokens: data.usage.completion_tokens || 0,
            total_tokens: data.usage.total_tokens || 0,
          } : undefined,
          status: 'completed',
        };
        return new Response(JSON.stringify(transformed), {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // No choices field — reconstruct the response with the original body
      return new Response(bodyText, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch {
      // Transformation failed — reconstruct with whatever body we have
      return new Response(bodyText || '{}', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
  }

  return response;
} as typeof fetch;
