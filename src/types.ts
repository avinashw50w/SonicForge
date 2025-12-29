export enum LoopCategory {
  ORIGINAL = 'Original',
  BEST = 'Best',
  SHORTEST = 'Shortest',
  LONGEST = 'Longest',
  EARLIEST = 'Earliest',
  LATEST = 'Latest',
  CANDIDATE = 'Candidate',
}

export interface AudioLoop {
  id: string;
  category: LoopCategory;
  start: number; // in seconds
  end: number; // in seconds
  description: string;
}

export interface AnalysisResult {
  loops: AudioLoop[];
}

export type PlaybackState = 'playing' | 'paused' | 'stopped';