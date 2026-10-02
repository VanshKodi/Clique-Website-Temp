export type Remainder = 'balanced' | 'fillLast' | 'bench';
export type ByMode = 'size' | 'count';

export interface Person {
  id: string;
  name: string;
  photo: string;
  present: boolean;
}

export interface Settings {
  by: ByMode;
  size: number;
  count: number;
  remainder: Remainder;
}

export interface Team {
  id: string;
  index: number;
  name: string;
  color: string;
  memberIds: string[];
  kind: 'team' | 'bench';
}

export type PlanWarning = 'single-person-team';

export interface Plan {
  sizes: number[];
  bench: number;
  warnings: PlanWarning[];
}

export interface Animating {
  teamId: string;
  revealedIds: string[];
  poolIds: string[];
}
