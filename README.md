# LLM World

A React + TypeScript website where **Claude** plays a 2D grid game. Claude
perceives the grid, walks around, reads the word carved on a door (only when it
gets close enough), collects the scattered letters that spell the word, and
unlocks the door. You decide when Claude runs.

![concept](https://img.shields.io/badge/Claude-grid%20agent-6ea8fe)

## How it works

- Each level has a **door** with a hidden word. Claude can only read the word
  when standing on a tile next to the door.
- **Letters** are scattered around the grid. Claude must `pick_up` the letters
  that spell the word, then stand next to the door and `unlock` it.
- Claude can also `drop` letters. **Each tile holds at most one letter or the
  door** — so dropping requires an empty tile. Some levels include decoy
  letters that aren't part of the word.
- There are **multiple levels** of increasing size and difficulty.
- You control the run: **Run / Pause / Step / Reset**, choose the level, the
  model, the thinking effort, and the delay between actions.

Claude drives the world through four tools — `move`, `pick_up`, `drop`,
`unlock` — in an agentic loop. Its reasoning (summarized adaptive thinking) and
every action are streamed into the activity log.

## Architecture

```
browser (Vite + React)                     server (Express)
┌─────────────────────────────┐            ┌────────────────────────────┐
│ game engine + state          │            │ POST /api/agent            │
│ agent loop (run/pause/step)  │  /api ───▶ │  → Anthropic Messages API  │
│ grid rendering + controls    │ ◀───────── │  (key stays server-side)   │
└─────────────────────────────┘            └────────────────────────────┘
```

The browser owns the game state and the loop, sending the full conversation
each turn. The Express proxy only attaches the model config and **prompt-caches
the stable prefix** (tool definitions + system prompt), so the API key never
reaches the browser and repeated turns are cheap.

- Model: **`claude-opus-4-8`** by default (Sonnet 4.6 / Haiku 4.5 selectable).
- Adaptive thinking with `display: "summarized"` so reasoning shows in the UI.
- `output_config.effort` defaults to `low` for snappy turns; tune it in the UI.

## Setup

```bash
npm install
cp .env.example .env        # then put your key in .env
```

Edit `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
PORT=8787
```

## Run

```bash
npm run dev
```

This starts the Express proxy (`:8787`) and the Vite dev server (`:5173`)
together. Open **http://localhost:5173** and press **Run Claude**.

> No key yet? The app still loads and shows a banner; the engine, controls, and
> rendering all work — only the actual Claude calls need the key.

## Project layout

| Path | Purpose |
|------|---------|
| `server/index.ts` | Express proxy → Anthropic SDK (holds the API key) |
| `src/game/` | `types`, `levels`, and the pure `engine` (movement, pickup, spelling, unlock, observation) |
| `src/agent/` | tool schemas + executor, frozen system prompt, fetch client |
| `src/useLLMWorld.ts` | game state + the run/pause/step agent loop |
| `src/components/` | `GridView`, `ControlPanel`, `LogPanel` |

## Build

```bash
npm run build     # typecheck + production bundle into dist/
```

## Example logs
<img width="1520" height="827" alt="image" src="https://github.com/user-attachments/assets/5b1bc827-7648-4bee-88d3-36761d0234f2" />


## Adding a level

Append a `Level` to `LEVELS` in `src/game/levels.ts`: set `width`/`height`,
`walls`, the agent `start`, the `door` (with its `word`), and the `letters`
(include the ones that spell the word plus any decoys). It appears in the level
dropdown automatically.
