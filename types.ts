
export interface Point {
  x: number;
  y: number;
}

export interface Fruit {
  id: string;
  x: number;
  y: number;
  speed: number;
  emoji: string;
  points: number;
  radius: number;
}

export interface GameState {
  score: number;
  timeLeft: number;
  status: 'idle' | 'playing' | 'gameover';
}

export const FRUIT_TYPES = [
  { emoji: '🍎', points: 10 },
  { emoji: '🍊', points: 15 },
  { emoji: '🍌', points: 20 },
  { emoji: '🍇', points: 25 },
  { emoji: '🍓', points: 30 },
  { emoji: '🍉', points: 50 },
];
