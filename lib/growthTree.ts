/**
 * Growth Tree
 *
 * Turns the user's cumulative devotion days into a living tree that grows
 * through visual stages. The tree is driven by TOTAL completed days (it never
 * shrinks — a tree shouldn't die for one missed day), while the current streak
 * only controls whether the tree looks "thriving" (vibrant green) or just
 * needs a little water today (muted leaves).
 */

export type GrowthStageKey =
  | 'seed'
  | 'sprout'
  | 'seedling'
  | 'sapling'
  | 'young'
  | 'leafy'
  | 'flowering'
  | 'fruiting'
  | 'flourishing'
  | 'lifeTree';

export type GrowthStageDef = {
  index: number;
  key: GrowthStageKey;
  /** Total completed devotion days required to reach this stage. */
  minDays: number;
};

/** Ordered growth stages. Each stage unlocks at `minDays` cumulative days. */
export const GROWTH_STAGES: GrowthStageDef[] = [
  { index: 0, key: 'seed', minDays: 0 },
  { index: 1, key: 'sprout', minDays: 1 },
  { index: 2, key: 'seedling', minDays: 3 },
  { index: 3, key: 'sapling', minDays: 7 },
  { index: 4, key: 'young', minDays: 14 },
  { index: 5, key: 'leafy', minDays: 30 },
  { index: 6, key: 'flowering', minDays: 60 },
  { index: 7, key: 'fruiting', minDays: 90 },
  { index: 8, key: 'flourishing', minDays: 180 },
  { index: 9, key: 'lifeTree', minDays: 365 },
];

export const MAX_GROWTH_STAGE_INDEX = GROWTH_STAGES.length - 1;

export type GrowthTreeInfo = {
  stage: GrowthStageDef;
  nextStage: GrowthStageDef | null;
  isMax: boolean;
  completedDays: number;
  /** Cumulative days still needed to reach the next stage (0 when maxed). */
  daysToNext: number;
  /** Progress 0..1 from the current stage toward the next one. */
  progress: number;
  /** True when the user has an active streak (tree looks vibrant). */
  thriving: boolean;
};

/** Resolves the full growth-tree info from cumulative days and current streak. */
export function getGrowthTreeInfo(
  completedDays: number,
  streak: number,
): GrowthTreeInfo {
  const days = Math.max(completedDays, 0);

  let stage = GROWTH_STAGES[0];
  for (const candidate of GROWTH_STAGES) {
    if (days >= candidate.minDays) {
      stage = candidate;
    } else {
      break;
    }
  }

  const nextStage =
    stage.index < MAX_GROWTH_STAGE_INDEX
      ? GROWTH_STAGES[stage.index + 1]
      : null;

  const isMax = nextStage === null;
  const daysToNext = nextStage ? Math.max(nextStage.minDays - days, 0) : 0;

  let progress = 1;
  if (nextStage) {
    const span = nextStage.minDays - stage.minDays;
    progress = span > 0 ? (days - stage.minDays) / span : 1;
    progress = Math.min(Math.max(progress, 0), 1);
  }

  return {
    stage,
    nextStage,
    isMax,
    completedDays: days,
    daysToNext,
    progress,
    thriving: streak > 0,
  };
}
