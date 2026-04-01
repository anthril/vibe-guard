import type { Rule } from '../../types.js';
import { importAliases } from './import-aliases.js';
import { noUseClientInPages } from './no-use-client-in-pages.js';

export const qualityRules: Rule[] = [importAliases, noUseClientInPages];

export { importAliases, noUseClientInPages };
