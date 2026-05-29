import type { Level } from './types'

/** Build a rectangular border of walls plus any interior walls. */
function border(width: number, height: number, interior: [number, number][] = []) {
  const walls: { x: number; y: number }[] = []
  for (let x = 0; x < width; x++) {
    walls.push({ x, y: 0 })
    walls.push({ x, y: height - 1 })
  }
  for (let y = 1; y < height - 1; y++) {
    walls.push({ x: 0, y })
    walls.push({ x: width - 1, y })
  }
  for (const [x, y] of interior) walls.push({ x, y })
  return walls
}

export const LEVELS: Level[] = [
  {
    id: 'cat',
    name: '1 · CAT',
    width: 9,
    height: 7,
    walls: border(9, 7),
    start: { x: 1, y: 1 },
    door: { x: 7, y: 3, word: 'CAT' },
    letters: [
      { x: 2, y: 5, char: 'C' },
      { x: 5, y: 1, char: 'A' },
      { x: 4, y: 4, char: 'T' },
    ],
    hint: 'Three letters spell the word on the door. Collect them, then unlock.',
  },
  {
    id: 'door',
    name: '2 · DOOR',
    width: 11,
    height: 9,
    walls: border(11, 9, [
      [4, 2],
      [4, 3],
      [4, 4],
      [4, 5],
      [6, 4],
      [7, 4],
      [8, 4],
    ]),
    start: { x: 1, y: 1 },
    door: { x: 9, y: 7, word: 'DOOR' },
    letters: [
      { x: 2, y: 6, char: 'D' },
      { x: 6, y: 1, char: 'O' },
      { x: 9, y: 2, char: 'O' },
      { x: 2, y: 3, char: 'R' },
      // A decoy letter that is NOT in the word — Claude can drop it if it
      // picks it up by mistake.
      { x: 7, y: 6, char: 'Z' },
    ],
    hint: 'The word has a repeated letter. There is also a decoy letter you do not need.',
  },
  {
    id: 'maze',
    name: '3 · LOGIC',
    width: 13,
    height: 11,
    walls: border(13, 11, [
      [3, 1],
      [3, 2],
      [3, 3],
      [3, 4],
      [3, 5],
      [3, 6],
      [3, 7],
      [6, 3],
      [6, 4],
      [6, 5],
      [6, 6],
      [6, 7],
      [6, 8],
      [6, 9],
      [9, 1],
      [9, 2],
      [9, 3],
      [9, 4],
      [9, 5],
    ]),
    start: { x: 1, y: 1 },
    door: { x: 11, y: 9, word: 'LOGIC' },
    letters: [
      { x: 2, y: 8, char: 'L' },
      { x: 5, y: 1, char: 'O' },
      { x: 8, y: 9, char: 'G' },
      { x: 11, y: 1, char: 'I' },
      { x: 7, y: 2, char: 'C' },
      { x: 4, y: 9, char: 'X' },
      { x: 10, y: 6, char: 'Q' },
    ],
    hint: 'Walls split the room into corridors. Two decoy letters are scattered in.',
  },
]

export function getLevel(id: string): Level {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0]
}
