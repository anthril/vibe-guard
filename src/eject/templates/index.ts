import type { HookEvent } from '../../types.js';
import * as security from './security.js';
import * as quality from './quality.js';
import * as workflow from './workflow.js';

export interface RuleTemplateContext {
  ruleId: string;
  severity: string;
  options: Record<string, unknown>;
  event: HookEvent;
}

type RuleTemplateFn = (ctx: RuleTemplateContext) => string;

/** Registry mapping rule IDs to their template functions */
const TEMPLATE_REGISTRY: Map<string, RuleTemplateFn> = new Map([
  // Security
  ['security/branch-protection', security.branchProtection],
  ['security/destructive-commands', security.destructiveCommands],
  ['security/secret-detection', security.secretDetection],
  ['security/prompt-injection', security.promptInjection],
  ['security/dependency-audit', security.dependencyAudit],
  ['security/env-exposure', security.envExposure],
  ['security/rls-required', security.rlsRequired],

  // Quality
  ['quality/anti-patterns', quality.antiPatterns],
  ['quality/import-aliases', quality.importAliases],
  ['quality/no-use-client-in-pages', quality.noUseClientInPages],
  ['quality/no-deprecated-api', quality.noDeprecatedApi],
  ['quality/naming-conventions', quality.namingConventions],
  ['quality/no-console-log', quality.noConsoleLog],
  ['quality/max-file-length', quality.maxFileLength],
  ['quality/hallucination-guard', quality.hallucinationGuard],
  ['quality/test-coverage', quality.testCoverage],
  ['quality/file-structure', quality.fileStructure],
  ['quality/dead-exports', quality.deadExports],

  // Workflow
  ['workflow/commit-conventions', workflow.commitConventions],
  ['workflow/migration-safety', workflow.migrationSafety],
  ['workflow/changelog-reminder', workflow.changelogReminder],
  ['workflow/todo-tracker', workflow.todoTracker],
  ['workflow/pr-reminder', workflow.prReminder],
  ['workflow/format-on-save', workflow.formatOnSave],
  ['workflow/review-gate', workflow.reviewGate],
]);

/**
 * Get the template function for a rule ID.
 * Returns undefined if no template exists (rule cannot be inlined).
 */
export function getTemplate(ruleId: string): RuleTemplateFn | undefined {
  return TEMPLATE_REGISTRY.get(ruleId);
}

/**
 * Check if a rule has an inline template.
 */
export function hasTemplate(ruleId: string): boolean {
  return TEMPLATE_REGISTRY.has(ruleId);
}
