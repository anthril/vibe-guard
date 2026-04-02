/**
 * Eject module — exports standalone hook bundling and template system.
 */
export { bundleHookScript } from './bundler.js';
export { getTemplate, hasTemplate } from './templates/index.js';
export type { RuleTemplateContext } from './templates/index.js';
