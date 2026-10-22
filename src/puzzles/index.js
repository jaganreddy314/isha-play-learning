import { ArrayPuzzle } from './array.js';
import { SharePuzzle } from './share.js';
import { ClockPuzzle } from './clock.js';
import { LinePuzzle } from './line.js';
import { LetterPuzzle } from './letters.js';
import { CardPuzzle } from './card.js';
import { SplitPuzzle } from './split.js';
import { FingersPuzzle } from './fingers.js';
import { VedicPuzzle } from './vedic.js';

const KINDS = {
  array: ArrayPuzzle, share: SharePuzzle, clock: ClockPuzzle, line: LinePuzzle, letters: LetterPuzzle, card: CardPuzzle,
  split: SplitPuzzle, fingers: FingersPuzzle, vedic: VedicPuzzle,
};

export function createPuzzle(q, ctx) {
  const P = KINDS[q.visual?.type] || CardPuzzle;
  return new P(q, ctx);
}
