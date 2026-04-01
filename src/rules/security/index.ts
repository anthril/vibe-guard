import type { Rule } from '../../types.js';
import { branchProtection } from './branch-protection.js';
import { destructiveCommands } from './destructive-commands.js';
import { secretDetection } from './secret-detection.js';

export const securityRules: Rule[] = [branchProtection, destructiveCommands, secretDetection];

export { branchProtection, destructiveCommands, secretDetection };
