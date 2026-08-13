import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  model?: string;
  thinking?: Record<string, unknown>;
  reasoning?: Record<string, unknown>;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

const assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    // Check if Claude key might be configured in DB, but we allow fallback
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

const RETRY_MAX_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 30_000;

type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

const parseRetryAfter = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
};

// Equal-jitter exponential backoff. The cap/2 floor guarantees a minimum
// delay so a misbehaving caller loop slows down instead of hammering the
// upstream while it keeps returning errors.
const computeBackoffDelay = (
  attempt: number,
  retryAfterMs?: number
): number => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};

// Retries non-2xx responses and network errors with exponential backoff, then
// returns the final Response so callers keep their existing error handling.
const fetchWithBackoff = async (
  url: string,
  init: FetchInit
): Promise<Response> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }

      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
        // Body already settled; nothing to clean up.
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("LLM request failed after exhausting retries");
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens,
  } = params;

  const payload: Record<string, unknown> = {
    messages: messages.map(normalizeMessage),
  };

  if (model) {
    payload.model = model;
  }

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }

  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  let apiKey = ENV.forgeApiKey;
  let customClaudeKey = "";
  try {
    const { getDb } = await import("../db");
    const { systemConfig } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    if (db) {
      const rows = await db.select().from(systemConfig).where(eq(systemConfig.configKey, "CLAUDE_API_KEY")).limit(1);
      if (rows.length > 0 && rows[0].configValue && rows[0].configValue.trim().length > 5) {
        customClaudeKey = rows[0].configValue.trim();
      }
    }
  } catch (err) {
    // fallback to env
  }

  // Default to the ANTHROPIC_API_KEY environment variable (e.g. set on Railway)
  // when no key has been saved via the in-app Settings panel.
  if (!customClaudeKey && process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 5) {
    customClaudeKey = process.env.ANTHROPIC_API_KEY.trim();
  }

  // If a custom Anthropic Claude API key is configured, use Anthropic's Messages API directly
  if (customClaudeKey && (customClaudeKey.startsWith("sk-ant-") || customClaudeKey.length > 20)) {
    // Convert OpenAI-style chat messages and schema to Anthropic format
    let systemText = "You extract real-estate inventory tables from images and PDF reports. Return only structured JSON.";
    const anthropicMessages: Array<{ role: string; content: any }> = [];
    
    for (const msg of messages) {
      if (msg.role === "system") {
        const parts = ensureArray(msg.content);
        systemText = parts.map(p => typeof p === "string" ? p : p.type === "text" ? p.text : "").join("\n");
      } else {
        const parts = ensureArray(msg.content);
        const anthropicContent: any[] = [];
        for (const p of parts) {
          if (typeof p === "string") {
            anthropicContent.push({ type: "text", text: p });
          } else if (p.type === "text") {
            anthropicContent.push({ type: "text", text: p.text });
          } else if (p.type === "image_url") {
            // image_url url is data:image/jpeg;base64,...
            const urlMatch = p.image_url.url.match(/^data:([^;]+);base64,(.+)$/);
            if (urlMatch) {
              anthropicContent.push({
                type: "image",
                source: {
                  type: "base64",
                  media_type: urlMatch[1],
                  data: urlMatch[2],
                },
              });
            }
          } else if (p.type === "file_url") {
            // PDF file_url
            const urlMatch = p.file_url.url.match(/^data:([^;]+);base64,(.+)$/);
            if (urlMatch) {
              anthropicContent.push({
                type: "document",
                source: {
                  type: "base64",
                  media_type: urlMatch[1],
                  data: urlMatch[2],
                },
              });
            }
          }
        }
        anthropicMessages.push({ role: msg.role === "assistant" ? "assistant" : "user", content: anthropicContent.length === 1 && anthropicContent[0].type === "text" ? anthropicContent[0].text : anthropicContent });
      }
    }

    const anthropicPayload: Record<string, unknown> = {
      model: model && model.includes("claude") ? model : "claude-3-5-sonnet-20241022",
      max_tokens: resolvedMaxTokens || 4096,
      system: systemText,
      messages: anthropicMessages,
    };

    if (normalizedResponseFormat && normalizedResponseFormat.type === "json_schema") {
      const schemaName = normalizedResponseFormat.json_schema.name;
      const jsonSchema = normalizedResponseFormat.json_schema.schema;
      anthropicPayload.tools = [{
        name: schemaName,
        description: "Extract structured inventory units according to schema",
        input_schema: jsonSchema,
      }];
      anthropicPayload.tool_choice = { type: "tool", name: schemaName };
      // Also reinforce in system prompt that output must match the tool or JSON
      systemText += "\nCRITICAL: You must invoke the tool '" + schemaName + "' to return the extracted units in exact JSON schema format.";
      anthropicPayload.system = systemText;
    }

    const anthResp = await fetchWithBackoff("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": customClaudeKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(anthropicPayload),
    });

    if (!anthResp.ok) {
      const errorText = await anthResp.text();
      console.error("[Claude API] Error response:", anthResp.status, errorText);
      throw new Error(`Claude API invoke failed: ${anthResp.status} ${anthResp.statusText} – ${errorText}`);
    }

    const anthData = await anthResp.json() as any;

    // If the model hit the token cap mid-generation, the tool_use JSON is
    // incomplete. jsonrepair downstream would "fix" it by closing brackets
    // early, silently dropping every unit after the cutoff with no error
    // surfaced. Fail loudly instead so the caller can flag the file/page as
    // failed rather than quietly returning a partial unit list.
    if (anthData.stop_reason === "max_tokens") {
      throw new Error(
        "Claude API invoke failed: response was cut off at the max_tokens limit before finishing — extracted units for this page are incomplete. Increase max_tokens or split the page into smaller sections."
      );
    }

    // Parse Anthropic response (tool_use or text content)
    let textOutput = "";
    if (anthData.content) {
      for (const block of anthData.content) {
        if (block.type === "text") {
          textOutput += block.text;
        } else if (block.type === "tool_use" && block.input) {
          textOutput = JSON.stringify(block.input);
        }
      }
    }
    if (!textOutput && anthData.content) {
      textOutput = JSON.stringify(anthData.content);
    }
    // If textOutput is not starting with { or [, wrap in {"units": []} or parse robustly
    if (textOutput && !textOutput.trim().startsWith("{") && !textOutput.trim().startsWith("[")) {
      textOutput = JSON.stringify({ units: [], rawText: textOutput });
    }

    return {
      id: anthData.id || "msg_anthropic",
      created: Date.now(),
      model: anthData.model || "claude-3-5-sonnet",
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: textOutput,
        },
        finish_reason: anthData.stop_reason || "stop",
      }],
      usage: anthData.usage ? {
        prompt_tokens: anthData.usage.input_tokens || 0,
        completion_tokens: anthData.usage.output_tokens || 0,
        total_tokens: (anthData.usage.input_tokens || 0) + (anthData.usage.output_tokens || 0),
      } : undefined,
    };
  }

  const response = await fetchWithBackoff(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}

export type ModelInfo = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
};

export type ModelsResponse = {
  object: string;
  data: ModelInfo[];
};

export async function listLLMModels(): Promise<ModelsResponse> {
  assertApiKey();

  const url = ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/models`
    : "https://forge.manus.im/v1/models";

  const response = await fetchWithBackoff(url, {
    headers: { authorization: `Bearer ${ENV.forgeApiKey}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `List LLM models failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as ModelsResponse;
}
