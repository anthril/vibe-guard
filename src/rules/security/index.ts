import type { Rule } from '../../types.js';
import { branchProtection } from './branch-protection.js';
import { destructiveCommands } from './destructive-commands.js';
import { secretDetection } from './secret-detection.js';
import { promptInjection } from './prompt-injection.js';
import { dependencyAudit } from './dependency-audit.js';
import { envExposure } from './env-exposure.js';
import { rlsRequired } from './rls-required.js';
import { unsafeEval } from './unsafe-eval.js';
import { noHardcodedUrls } from './no-hardcoded-urls.js';
import { xssPrevention } from './xss-prevention.js';
import { sqlInjection } from './sql-injection.js';

export const securityRules: Rule[] = [
  branchProtection,
  destructiveCommands,
  secretDetection,
  promptInjection,
  dependencyAudit,
  envExposure,
  rlsRequired,
  unsafeEval,
  noHardcodedUrls,
  xssPrevention,
  sqlInjection,
];

export {
  branchProtection,
  destructiveCommands,
  secretDetection,
  promptInjection,
  dependencyAudit,
  envExposure,
  rlsRequired,
  unsafeEval,
  noHardcodedUrls,
  xssPrevention,
  sqlInjection,
};
