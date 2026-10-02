import { SlotsMode } from './slots/SlotsMode';
import { CardPackMode } from './cardpack/CardPackMode';
import { WheelMode } from './wheel/WheelMode';
import { LotteryMode } from './lottery/LotteryMode';
import { HorseRaceMode } from './horse/HorseRaceMode';
import { SpotlightGridMode } from './spotlight/SpotlightGridMode';
import type { ModeEntry } from './types';

export const REGISTRY: ModeEntry[] = [
  { id: 'slots', label: 'Slots', icon: '🎰', Component: SlotsMode },
  { id: 'cardpack', label: 'Card Pack', icon: '🎁', Component: CardPackMode },
  { id: 'wheel', label: 'Wheel', icon: '🎡', Component: WheelMode },
  { id: 'lottery', label: 'Lottery', icon: '🎱', Component: LotteryMode },
  { id: 'horsrace', label: 'Horse Race', icon: '🏇', Component: HorseRaceMode },
  { id: 'spotlight', label: 'Spotlight', icon: '🔦', Component: SpotlightGridMode },
];

export const DEFAULT_MODE = 'slots';
