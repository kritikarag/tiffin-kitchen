import Anthropic from "@anthropic-ai/sdk";

// The shapes below are the parts of Claude's Messages API this app uses.
// A conversation is a list of messages. Each message is made of blocks.

export type TextBlock = { type: "text"; text: string };
// Claude asking us to run a tool. `id` links the request to its result.
export type ToolUseBlock = { type: "tool_use"; id: string; name: string; input: unknown };
// Our answer to a tool_use block. It goes back to Claude inside a user message.
export type ToolResultBlock = { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export type Message =
  | { role: "user"; content: string | (TextBlock | ToolResultBlock)[] }
  | { role: "assistant"; content: (TextBlock | ToolUseBlock)[] };

// What Claude is told about a tool: its name, when to use it, and the JSON shape of its input.
export type ToolDefinition = {
  name: string;
  description: string;
  input_schema: { type: "object"; properties: Record<string, unknown>; required?: string[] };
};

export type ModelRequest = {
  system: string;
  messages: Message[];
  tools: ToolDefinition[];
  forceTool?: string; // make Claude answer by calling this one tool (used to get structured JSON back)
  maxTokens?: number;
};
export type ModelResponse = { content: (TextBlock | ToolUseBlock)[] };

// The agent only ever talks to the model through this function type.
// Production passes callClaude; the tests pass a scripted stand-in, so they need no API key.
export type ModelCall = (request: ModelRequest) => Promise<ModelResponse>;

let client: Anthropic | undefined;

export const callClaude: ModelCall = async (request) => {
  client ??= new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL ?? "claude-sonnet-5-5",
    max_tokens: request.maxTokens ?? 1024,
    system: request.system,
    messages: request.messages,
    tools: request.tools,
    ...(request.forceTool ? { tool_choice: { type: "tool" as const, name: request.forceTool } } : {}),
  });
  // Keep only the two block types we store and replay.
  const content: ModelResponse["content"] = [];
  for (const block of response.content) {
    if (block.type === "text" && block.text) content.push({ type: "text", text: block.text });
    if (block.type === "tool_use") content.push({ type: "tool_use", id: block.id, name: block.name, input: block.input });
  }
  return { content };
};
