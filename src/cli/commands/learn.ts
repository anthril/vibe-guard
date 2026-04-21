import { walkProject } from '../../learn/walker.js';
import { aggregateConventions, saveConventions } from '../../learn/aggregator.js';
import { getPromotionSuggestions } from '../../learn/promoter.js';
import { startSpinner } from '../ui/spinner.js';
import { printBanner } from '../ui/banner.js';

export async function learnCommand(): Promise<void> {
  const projectRoot = process.cwd();

  printBanner('Learn', 'Scanning codebase for conventions');

  const startTime = Date.now();

  const spinner = startSpinner('Walking project files');
  const files = walkProject({ rootDir: projectRoot });
  const scanTime = Date.now() - startTime;
  spinner.succeed(`Scanned ${files.length} files in ${scanTime}ms`);

  if (files.length === 0) {
    console.log('  No source files found to analyze.\n');
    return;
  }

  const aggregationSpinner = startSpinner('Aggregating conventions');
  const report = aggregateConventions(files, projectRoot);
  aggregationSpinner.succeed('Conventions aggregated');

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
