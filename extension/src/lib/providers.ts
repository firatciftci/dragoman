import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { browser } from "wxt/browser";
import { z } from "zod";

export const providers = {
  anthropic: {
    name: "Anthropic",
    keyUrl: "https://platform.claude.com/settings/keys",
    baseUrl: "https://api.anthropic.com",
    keyPattern: /^sk-ant-/,
    prefer: [/haiku/, /sonnet/],
  },
  openai: {
    name: "OpenAI",
    keyUrl: "https://platform.openai.com/api-keys",
    baseUrl: "https://api.openai.com/v1",
    keyPattern: /^sk-/,
    prefer: [/^gpt-[\d.]+-mini$/, /^gpt-.*mini/, /^gpt-/],
  },
  gemini: {
    name: "Google Gemini",
    keyUrl: "https://aistudio.google.com/apikey",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    keyPattern: /^AIza/,
    prefer: [
      /^gemini-[\d.]+-flash$/,
      /^gemini-.*flash(?!.*(?:image|tts|live|audio))/,
    ],
  },
  openrouter: {
    name: "OpenRouter",
    keyUrl: "https://openrouter.ai/settings/keys",
    baseUrl: "https://openrouter.ai/api/v1",
    keyPattern: /^sk-or-/,
    prefer: [
      /^anthropic\/claude-haiku/,
      /^google\/gemini-.*flash$/,
      /^openai\/gpt-.*mini$/,
    ],
  },
  mistral: {
    name: "Mistral",
    keyUrl: "https://console.mistral.ai/api-keys",
    baseUrl: "https://api.mistral.ai/v1",
    keyPattern: /^\w{32}$/,
    prefer: [/^mistral-medium-latest$/, /^mistral-small-latest$/],
  },
  deepseek: {
    name: "DeepSeek",
    keyUrl: "https://platform.deepseek.com/api_keys",
    baseUrl: "https://api.deepseek.com",
    keyPattern: /^sk-/,
    prefer: [/^deepseek-chat$/],
  },
  groq: {
    name: "Groq",
    keyUrl: "https://console.groq.com/keys",
    baseUrl: "https://api.groq.com/openai/v1",
    keyPattern: /^gsk_/,
    prefer: [/gpt-oss-120b/, /llama-3\.3-70b/],
  },
  xai: {
    name: "xAI",
    keyUrl: "https://console.x.ai",
    baseUrl: "https://api.x.ai/v1",
    keyPattern: /^xai-/,
    prefer: [/^grok-.*fast/, /^grok-.*mini/],
  },
  ollama: {
    name: "Ollama",
    keyUrl: "https://ollama.com/download",
    baseUrl: "http://localhost:11434/v1",
    keyPattern: null,
    prefer: [/gemma/, /qwen/, /llama/],
  },
  lmstudio: {
    name: "LM Studio",
    keyUrl: "https://lmstudio.ai/download",
    baseUrl: "http://localhost:1234/v1",
    keyPattern: null,
    prefer: [/gemma/, /qwen/, /llama/],
  },
  custom: {
    name: "Custom",
    keyUrl: null,
    baseUrl: "",
    keyPattern: null,
    prefer: [],
  },
} as const satisfies Record<
  string,
  {
    name: string;
    keyUrl: string | null;
    baseUrl: string;
    keyPattern: RegExp | null;
    prefer: Array<RegExp>;
  }
>;

export type ProviderId = keyof typeof providers;

export type Connection = {
  provider: ProviderId;
  key: string;
  model: string;
  baseUrl: string;
  workspace: string;
};

export type Model = { id: string; name: string };

const Output = z.object({
  terms: z.array(z.object({ source: z.string(), target: z.string() })),
  translations: z.array(z.object({ id: z.string(), text: z.string() })),
});

const IGNORED =
  /embed|tts|whisper|dall-e|image|audio|realtime|moderation|transcribe|search|computer-use|codex|veo|learnlm|aqa|guard|vision-preview/i;

function headers(connection: Connection) {
  return {
    "Content-Type": "application/json",
    ...(connection.key !== "" && { Authorization: `Bearer ${connection.key}` }),
    ...(connection.provider === "openrouter" && {
      "HTTP-Referer": "https://dragoman.io",
      "X-Title": "dragoman",
    }),
  };
}

function anthropic(connection: Connection) {
  return new Anthropic({
    apiKey: connection.key,
    dangerouslyAllowBrowser: true,
    defaultHeaders:
      connection.workspace === ""
        ? {}
        : { "anthropic-workspace-id": connection.workspace },
  });
}

export async function listModels(
  connection: Connection,
): Promise<Array<Model>> {
  if (connection.provider === "anthropic") {
    const page = await anthropic(connection).models.list({ limit: 100 });
    return page.data.map((model) => ({
      id: model.id,
      name: model.display_name,
    }));
  }
  const response = await fetch(`${connection.baseUrl}/models`, {
    headers: headers(connection),
  });
  if (!response.ok)
    throw new Error(`${response.status} ${response.statusText}`);
  const body = (await response.json()) as {
    data?: Array<{ id: string; name?: string }>;
  };
  return (body.data ?? [])
    .map((model) => ({
      id: model.id.replace(/^models\//, ""),
      name: model.name ?? model.id.replace(/^models\//, ""),
    }))
    .filter((model) => !IGNORED.test(model.id))
    .toSorted((a, b) => b.id.localeCompare(a.id, "en", { numeric: true }));
}

export function pickModel(provider: ProviderId, models: Array<Model>) {
  const patterns = providers[provider].prefer as ReadonlyArray<RegExp>;
  for (const pattern of patterns) {
    const match = models.find((model) => pattern.test(model.id));
    if (match != null) return match.id;
  }
  return models[0]?.id ?? "";
}

export async function complete(
  connection: Connection,
  system: string,
  context: string,
  prompt: string,
) {
  if (connection.provider === "anthropic") {
    const isHaiku = connection.model.startsWith("claude-haiku");
    const response = await anthropic(connection).messages.parse({
      model: connection.model,
      max_tokens: 16_000,
      ...(isHaiku && { thinking: { type: "disabled" as const } }),
      system: [
        { type: "text", text: system, cache_control: { type: "ephemeral" } },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: context,
              cache_control: { type: "ephemeral" },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(Output),
        ...(!isHaiku && { effort: "low" as const }),
      },
    });
    if (response.stop_reason !== "end_turn" || response.parsed_output == null) {
      throw new Error(
        `The model stopped early (${response.stop_reason ?? "unknown"})`,
      );
    }
    const read = response.usage.cache_read_input_tokens ?? 0;
    const written = response.usage.cache_creation_input_tokens ?? 0;
    return {
      terms: response.parsed_output.terms,
      translations: response.parsed_output.translations,
      inputTokens: response.usage.input_tokens + read + written,
      cachedTokens: read,
      writtenTokens: written,
      outputTokens: response.usage.output_tokens,
      cost: null,
    };
  }

  const isReasoning = /^(?:gpt-5|o\d)|^gemini-[3-9]/.test(connection.model);
  const isMarked =
    connection.provider === "openrouter" &&
    connection.model.startsWith("anthropic/");
  const instructions = `${system}\n\nRespond with JSON shaped like {"terms":[{"source":"...","target":"..."}],"translations":[{"id":"0","text":"..."}]}.`;
  const request = async (isStrict: boolean) =>
    fetch(`${connection.baseUrl}/chat/completions`, {
      method: "POST",
      headers: headers(connection),
      body: JSON.stringify({
        model: connection.model,
        messages: [
          isMarked
            ? {
                role: "system",
                content: [
                  {
                    type: "text",
                    text: instructions,
                    cache_control: { type: "ephemeral" },
                  },
                ],
              }
            : { role: "system", content: instructions },
          isMarked
            ? {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: context,
                    cache_control: { type: "ephemeral" },
                  },
                  { type: "text", text: prompt },
                ],
              }
            : { role: "user", content: `${context}\n\n${prompt}` },
        ],
        response_format: isStrict
          ? {
              type: "json_schema",
              json_schema: {
                name: "translations",
                strict: true,
                schema: z.toJSONSchema(Output),
              },
            }
          : { type: "json_object" },
        ...(isStrict && isReasoning && { reasoning_effort: "low" }),
        ...(connection.provider === "openrouter" && {
          usage: { include: true },
        }),
        ...(connection.provider === "openai" && {
          prompt_cache_key: "dragoman",
        }),
      }),
    });
  let response = await request(true);
  if (response.status === 400 || response.status === 422)
    response = await request(false);
  if (!response.ok)
    throw Object.assign(new Error(await response.text()), {
      status: response.status,
    });
  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      prompt_tokens_details?: { cached_tokens?: number };
      cost?: number;
    };
  };
  const content = body.choices?.[0]?.message?.content ?? "";
  const json = content.slice(
    content.indexOf("{"),
    content.lastIndexOf("}") + 1,
  );
  const output = Output.parse({ terms: [], ...(JSON.parse(json) as object) });
  return {
    terms: output.terms,
    translations: output.translations,
    inputTokens: body.usage?.prompt_tokens ?? 0,
    cachedTokens: body.usage?.prompt_tokens_details?.cached_tokens ?? 0,
    writtenTokens: 0,
    outputTokens: body.usage?.completion_tokens ?? 0,
    cost: body.usage?.cost ?? null,
  };
}

export async function connectOpenRouter() {
  const hasIdentity = "identity" in browser;
  if (!hasIdentity) {
    try {
      await browser.permissions.request({ origins: ["https://dragoman.io/*"] });
    } catch {}
  }
  const verifier = btoa(
    String.fromCodePoint(...crypto.getRandomValues(new Uint8Array(48))),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
  );
  const challenge = btoa(String.fromCodePoint(...digest))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  const callback = hasIdentity
    ? browser.identity.getRedirectURL("openrouter")
    : "https://dragoman.io/";
  const url = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(callback)}&code_challenge=${challenge}&code_challenge_method=S256`;
  let redirect: string | undefined;
  if (hasIdentity) {
    redirect = await browser.identity.launchWebAuthFlow({
      url,
      interactive: true,
    });
  } else {
    const [current, tab] = await Promise.all([
      browser.tabs.getCurrent(),
      browser.tabs.create({ url }),
    ]);
    redirect = await new Promise<string>((resolve, reject) => {
      function stop() {
        browser.tabs.onUpdated.removeListener(onUpdated);
        browser.tabs.onRemoved.removeListener(onRemoved);
      }
      function onUpdated(id: number, change: { url?: string }) {
        if (id !== tab.id || change.url?.startsWith(callback) !== true) return;
        stop();
        resolve(change.url);
      }
      function onRemoved(id: number) {
        if (id !== tab.id) return;
        stop();
        reject(new Error("The OpenRouter tab was closed before connecting"));
      }
      browser.tabs.onUpdated.addListener(onUpdated);
      browser.tabs.onRemoved.addListener(onRemoved);
    });
    if (current?.id != null)
      await browser.tabs.update(current.id, { active: true });
    if (tab.id != null) await browser.tabs.remove(tab.id);
  }
  const code = new URL(redirect ?? "").searchParams.get("code");
  if (code == null) throw new Error("OpenRouter did not return a code");
  const response = await fetch("https://openrouter.ai/api/v1/auth/keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      code_verifier: verifier,
      code_challenge_method: "S256",
    }),
  });
  if (!response.ok)
    throw new Error(`${response.status} ${response.statusText}`);
  return ((await response.json()) as { key: string }).key;
}
