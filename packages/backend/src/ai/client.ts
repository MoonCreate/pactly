import OpenAI from "openai";

const BASE_URL = process.env.ZG_COMPUTE_BASE_URL;
const API_KEY = process.env.ZG_COMPUTE_API_KEY;

export const ZG_COMPUTE_MODEL =
	process.env.ZG_COMPUTE_MODEL ?? "qwen/qwen-2.5-7b-instruct";

if (!BASE_URL || !API_KEY) {
	console.warn(
		"[ai] ZG_COMPUTE_BASE_URL / ZG_COMPUTE_API_KEY not set — AI features will throw on use.",
	);
}

let _client: OpenAI | null = null;

/**
 * Lazy OpenAI client pointed at 0G Compute. Requires the env vars above.
 * The client speaks plain OpenAI Chat Completions; the underlying compute is
 * 0G's hosted qwen-2.5-7b-instruct.
 */
export function zgCompute(): OpenAI {
	if (_client) return _client;
	if (!BASE_URL || !API_KEY) {
		throw new Error(
			"0G Compute not configured — set ZG_COMPUTE_BASE_URL and ZG_COMPUTE_API_KEY",
		);
	}
	_client = new OpenAI({
		baseURL: BASE_URL,
		apiKey: API_KEY,
	});
	return _client;
}

export interface ChatTurn {
	role: "system" | "user" | "assistant";
	content: string;
}

export async function chat(
	turns: ChatTurn[],
	opts?: { maxTokens?: number; temperature?: number; jsonMode?: boolean },
): Promise<string> {
	const res = await zgCompute().chat.completions.create({
		model: ZG_COMPUTE_MODEL,
		messages: turns,
		max_tokens: opts?.maxTokens ?? 256,
		temperature: opts?.temperature ?? 0.6,
		...(opts?.jsonMode ? { response_format: { type: "json_object" } } : {}),
	});
	return res.choices[0]?.message?.content ?? "";
}
