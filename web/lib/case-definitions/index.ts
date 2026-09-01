import type { CaseDefinition } from '@/lib/case-definition';
import { fortyEightHoursOfStock } from '@/lib/case-definitions/forty-eight-hours-of-stock';
import { mondayScorecard } from '@/lib/case-definitions/monday-scorecard';
import { rollbackBeforeDawn } from '@/lib/case-definitions/rollback-before-dawn';
import { the730CapacityCall } from '@/lib/case-definitions/the-730-capacity-call';
import { navigationVoteCase } from '@/lib/case-definitions/the-navigation-vote';
import { theOrionRenewal } from '@/lib/case-definitions/the-orion-renewal';
import { quarterThatMovedCase } from '@/lib/case-definitions/the-quarter-that-moved';
import { theQueueNobodyOwns } from '@/lib/case-definitions/the-queue-nobody-owns';
import { tooGoodToShip } from '@/lib/case-definitions/too-good-to-ship';

export const caseDefinitions: CaseDefinition[] = [
  mondayScorecard,
  quarterThatMovedCase,
  navigationVoteCase,
  rollbackBeforeDawn,
  the730CapacityCall,
  fortyEightHoursOfStock,
  theOrionRenewal,
  theQueueNobodyOwns,
  tooGoodToShip,
];

export const caseDefinitionsBySlug: Record<string, CaseDefinition> = Object.fromEntries(
  caseDefinitions.map((definition) => [definition.slug, definition]),
);
