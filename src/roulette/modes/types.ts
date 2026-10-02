import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import type { Person } from '../engine/types';

export interface ModeProps {
  team: Person[];
  pool: Person[];
  teamLabel: string;
  speed: number;
  reducedMotion: boolean;
  onReveal: (p: Person, i: number) => void;
  onDone: () => void;
}

export interface ModeHandle {
  skip: () => void;
}

export type ModeComponent = ForwardRefExoticComponent<ModeProps & RefAttributes<ModeHandle>>;

export interface ModeEntry {
  id: string;
  label: string;
  icon: string;
  Component: ModeComponent;
}
