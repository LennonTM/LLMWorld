import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'

const PORT = Number(process.env.PORT ?? 8787)

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    '[llmworld] ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.',
  )
}

const client = new Anthropic()

const app = express()
app.use(cors())
app.use(express.json({ limit: '4mb' }))

interface AgentRequestBody {
  model?: string
  effort?: 'low' | 'medium' | 'high' | 'max'
  maxTokens?: number
  system: string
  tools: Anthropic.Tool[]
  messages: Anthropic.MessageParam[]
}

/**
 * Stateless proxy: the browser owns the game state and the agent loop, and
 * sends the full conversation each turn. We attach the model config and
 * prompt-cache the stable prefix (tools -> system), which never changes
 * across a level, so only the growing message tail is billed at full price.
 */
app.post('/api/agent', async (req, res) => {
  const body = req.body as AgentRequestBody
  try {
    // Mark the last tool with cache_control so the whole tool list + system
    // prompt are cached together (render order is tools -> system).
    const tools: Anthropic.ToolUnion[] = body.tools.map((t, i) =>
      i === body.tools.length - 1
        ? { ...t, cache_control: { type: 'ephemeral' } }
        : t,
    )

    const response = await client.messages.create({
      model: body.model || 'claude-opus-4-8',
      max_tokens: body.maxTokens ?? 2048,
      // Adaptive thinking with summarized display so the UI can show Claude's
      // reasoning between actions.
      thinking: { type: 'adaptive', display: 'summarized' },
      output_config: { effort: body.effort ?? 'low' },
      system: [
        { type: 'text', text: body.system, cache_control: { type: 'ephemeral' } },
      ],
      tools,
      messages: body.messages,
    })

    res.json({
      content: response.content,
      stop_reason: response.stop_reason,
      usage: response.usage,
    })
  } catch (err) {
    const e = err as { status?: number; message?: string }
    console.error('[llmworld] agent error:', e?.message ?? err)
    res.status(e?.status ?? 500).json({
      error: e?.message ?? 'Unknown error calling the Claude API.',
    })
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, hasKey: Boolean(process.env.ANTHROPIC_API_KEY) })
})

app.listen(PORT, () => {
  console.log(`[llmworld] proxy listening on http://localhost:${PORT}`)
})
