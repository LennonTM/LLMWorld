import { useCallback, useEffect, useRef, useState } from 'react'
import { createState, buildObservation } from './game/engine'
import { getLevel } from './game/levels'
import type { GameState } from './game/types'
import { SYSTEM_PROMPT } from './agent/systemPrompt'
import { TOOLS, executeTool } from './agent/tools'
import {
  callAgent,
  type Message,
  type ContentBlock,
  type ToolUseBlock,
  type TextBlock,
  type ThinkingBlock,
  type ToolResultBlock,
  type Usage,
} from './agent/client'

export const MODELS = [
  { id: 'claude-opus-4-8', label: 'Opus 4.8 (most capable)' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6 (faster)' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5 (fastest)' },
] as const

export type LogKind =
  | 'thought'
  | 'say'
  | 'action'
  | 'fail'
  | 'win'
  | 'error'
  | 'system'

export interface LogEntry {
  id: number
  kind: LogKind
  text: string
}

export interface Config {
  model: string
  effort: 'low' | 'medium' | 'high' | 'max'
  delayMs: number
}

const DEFAULT_CONFIG: Config = {
  model: 'claude-opus-4-8',
  effort: 'low', // "snappy" — least thinking, fastest turns
  delayMs: 250,
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function describeTool(tu: ToolUseBlock): string {
  if (tu.name === 'move') return `move ${tu.input.direction}`
  if (tu.name === 'drop') return `drop ${tu.input.letter}`
  return tu.name
}

export function useLLMWorld() {
  const [levelId, setLevelId] = useState(() => getLevel('cat').id)
  const [state, setState] = useState<GameState>(() => createState(getLevel('cat')))
  const [log, setLog] = useState<LogEntry[]>([])
  const [running, setRunning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG)
  const [keyOk, setKeyOk] = useState<boolean | null>(null)

  // Mutable mirrors so the async loop always sees the latest values.
  const stateRef = useRef(state)
  const messagesRef = useRef<Message[]>([])
  const runningRef = useRef(false)
  const busyRef = useRef(false)
  const configRef = useRef(config)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logId = useRef(0)

  useEffect(() => {
    configRef.current = config
  }, [config])

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d: { hasKey?: boolean }) => setKeyOk(Boolean(d.hasKey)))
      .catch(() => setKeyOk(false))
  }, [])

  const addLog = useCallback((kind: LogKind, text: string) => {
    setLog((prev) => [...prev, { id: logId.current++, kind, text }])
  }, [])

  const reset = useCallback(
    (id: string = stateRef.current.levelId) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      runningRef.current = false
      busyRef.current = false
      setRunning(false)
      setBusy(false)
      const fresh = createState(getLevel(id))
      stateRef.current = fresh
      messagesRef.current = []
      setState(fresh)
      setLevelId(id)
      setLog([])
      setUsage(null)
      logId.current = 0
    },
    [],
  )

  const stepOnce = useCallback(async () => {
    if (busyRef.current) return
    const cur = stateRef.current
    if (cur.won) {
      runningRef.current = false
      setRunning(false)
      return
    }
    busyRef.current = true
    setBusy(true)
    try {
      if (messagesRef.current.length === 0) {
        messagesRef.current = [
          {
            role: 'user',
            content: buildObservation(cur) + '\n\nTake your first action.',
          },
        ]
      }

      const resp = await callAgent({
        model: configRef.current.model,
        effort: configRef.current.effort,
        system: SYSTEM_PROMPT,
        tools: TOOLS as unknown as unknown[],
        messages: messagesRef.current,
      })
      setUsage(resp.usage)

      // Append the assistant turn verbatim (preserves thinking-block
      // signatures, which the API requires alongside tool use).
      messagesRef.current.push({ role: 'assistant', content: resp.content })

      for (const b of resp.content as ContentBlock[]) {
        if (b.type === 'thinking') {
          const t = (b as ThinkingBlock).thinking?.trim()
          if (t) addLog('thought', t)
        } else if (b.type === 'text') {
          const t = (b as TextBlock).text?.trim()
          if (t) addLog('say', t)
        }
      }

      const toolUses = (resp.content as ContentBlock[]).filter(
        (b): b is ToolUseBlock => b.type === 'tool_use',
      )

      if (toolUses.length === 0) {
        messagesRef.current.push({
          role: 'user',
          content:
            'You did not call a tool. Choose exactly one action using one of the available tools.',
        })
      } else {
        let next = stateRef.current
        const results: ToolResultBlock[] = []
        for (let i = 0; i < toolUses.length; i++) {
          const tu = toolUses[i]
          const out = executeTool(next, tu.name, tu.input)
          next = out.state
          addLog(
            out.result.ok ? 'action' : 'fail',
            `${describeTool(tu)} → ${out.result.message}`,
          )
          results.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: out.result.message + '\n\n' + buildObservation(next),
            is_error: !out.result.ok,
          })
          // Render each action individually so a multi-action turn animates
          // one tile at a time instead of jumping several blocks at once.
          stateRef.current = next
          setState(next)
          if (i < toolUses.length - 1) {
            await sleep(Math.min(configRef.current.delayMs, 300))
          }
        }
        messagesRef.current.push({ role: 'user', content: results })

        if (next.won) {
          addLog('win', `Solved ${next.name} in ${next.steps} steps. 🎉`)
          runningRef.current = false
          setRunning(false)
        }
      }
    } catch (e) {
      addLog('error', (e as Error).message)
      runningRef.current = false
      setRunning(false)
    } finally {
      busyRef.current = false
      setBusy(false)
      if (runningRef.current && !stateRef.current.won) {
        timerRef.current = setTimeout(() => {
          void stepOnce()
        }, configRef.current.delayMs)
      }
    }
  }, [addLog])

  const start = useCallback(() => {
    if (stateRef.current.won || runningRef.current) return
    runningRef.current = true
    setRunning(true)
    void stepOnce()
  }, [stepOnce])

  const pause = useCallback(() => {
    runningRef.current = false
    setRunning(false)
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const step = useCallback(() => {
    if (runningRef.current) return
    void stepOnce()
  }, [stepOnce])

  useEffect(() => () => void (timerRef.current && clearTimeout(timerRef.current)), [])

  return {
    state,
    levelId,
    log,
    running,
    busy,
    usage,
    config,
    keyOk,
    setConfig,
    start,
    pause,
    step,
    reset,
  }
}
