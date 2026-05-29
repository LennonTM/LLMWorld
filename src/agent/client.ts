/** Minimal mirror of the Anthropic content-block shapes we care about. */
export interface TextBlock {
  type: 'text'
  text: string
}
export interface ThinkingBlock {
  type: 'thinking'
  thinking: string
  signature?: string
}
export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}
export type ContentBlock = TextBlock | ThinkingBlock | ToolUseBlock | { type: string; [k: string]: unknown }

export interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
}

export type Message =
  | { role: 'user'; content: string | ToolResultBlock[] }
  | { role: 'assistant'; content: ContentBlock[] }

export interface Usage {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

export interface AgentResponse {
  content: ContentBlock[]
  stop_reason: string | null
  usage: Usage
}

export interface AgentRequest {
  model: string
  effort: 'low' | 'medium' | 'high' | 'max'
  system: string
  tools: unknown[]
  messages: Message[]
}

export async function callAgent(req: AgentRequest): Promise<AgentResponse> {
  const res = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || `Request failed with status ${res.status}`)
  }
  return (await res.json()) as AgentResponse
}
