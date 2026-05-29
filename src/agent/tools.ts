import type { Direction, GameState, ActionResult } from '../game/types'
import {
  applyDrop,
  applyMove,
  applyPickUp,
  applyUnlock,
} from '../game/engine'

/** Tool schemas sent to the Claude API. Kept stable so they cache. */
export const TOOLS = [
  {
    name: 'move',
    description:
      'Move one tile in a cardinal direction. Fails if blocked by a wall, the door, or the edge of the world.',
    input_schema: {
      type: 'object',
      properties: {
        direction: {
          type: 'string',
          enum: ['up', 'down', 'left', 'right'],
          description: 'Direction to step. up = -y, down = +y, left = -x, right = +x.',
        },
      },
      required: ['direction'],
      additionalProperties: false,
    },
  },
  {
    name: 'pick_up',
    description:
      'Pick up the letter on your current tile and put it in your inventory.',
    input_schema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'drop',
    description:
      'Drop a letter from your inventory onto your current tile. The tile must be empty (each tile holds at most one letter, and never the door).',
    input_schema: {
      type: 'object',
      properties: {
        letter: {
          type: 'string',
          description: 'The single letter to drop, e.g. "Z".',
        },
      },
      required: ['letter'],
      additionalProperties: false,
    },
  },
  {
    name: 'unlock',
    description:
      'Attempt to unlock the door. You must be standing on a tile orthogonally adjacent to the door, and your inventory must contain the letters that spell the door word.',
    input_schema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
] as const

export type ToolName = (typeof TOOLS)[number]['name']

/** Execute a tool against the current state, returning the next state. */
export function executeTool(
  state: GameState,
  name: string,
  input: Record<string, unknown>,
): { state: GameState; result: ActionResult } {
  switch (name) {
    case 'move':
      return applyMove(state, input.direction as Direction)
    case 'pick_up':
      return applyPickUp(state)
    case 'drop':
      return applyDrop(state, String(input.letter ?? ''))
    case 'unlock':
      return applyUnlock(state)
    default:
      return {
        state,
        result: { ok: false, message: `Unknown tool "${name}".` },
      }
  }
}
