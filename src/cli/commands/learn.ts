import { walkProject } from '../../learn/walker.js';
import { aggregateConventions, saveConventions } from '../../learn/aggregator.js';
import { getPromotionSuggestions } from '../../learn/promoter.js';

export async function learnCommand(): Promise<void> {
  const projectRoot = process.cwd();

  console.log('\n  VGuard Learn — Scanning codebase for conventions...\n');

  const startTime = Date.now();

  // Walk the project
  const files = walkProject({ rootDir: projectRoot });
  const scanTime = Date.now() - startTime;

  if (files.length === 0) {
    console.log('  No source files found to analyze.\n');
    return;
  }

  console.log(`  Scanned ${files.length} files in ${scanTime}ms\n`);

  // Aggregate conventions
  const report = aggregateConventions(files, projectRoot);

  // Save report
  const outputPath = await saveConventions(report, projectRoot);
  console.log(`  Saved conventions to ${outputPath}\n`);

  // Display patterns
  if (report.allPatterns.length === 0) {
    console.log('  No significant patterns detected.\n');
    return;
  }

  console.log('  Discovered patterns:\n');
  for (const pattern of report.allPatterns) {
    const confidence = Math.round(pattern.confidence * 100);
    const icon = pattern.promotable ? '+' : ' ';
    console.log(`  ${icon} [${confidence}%] ${pattern.description}`);
    if (pattern.examples.length > 0) {
      console.log(`         Examples: ${pattern.examples.slice(0, 2).join(', ')}`);
    }
  }

  // Show promotable suggestions
  const suggestions = getPromotionSuggestions(report.promotablePatterns);
  if (suggestions.length > 0) {
    console.log('\n  Promotable to rules:\n');
    for (const s of suggestions) {
      console.log(`    ${s.ruleId}: ${s.reason}`);
    }
    console.log('\n  Add these to your vguard.config.ts rules section.');
  }

  console.log();
}
