import { aggregateReport } from '../../report/aggregator.js';
import { generateMarkdownReport, saveReport } from '../../report/markdown.js';

export async function reportCommand(): Promise<void> {
  const projectRoot = process.cwd();

  console.log('\n  VGuard Report — Generating quality dashboard...\n');

  const data = aggregateReport(projectRoot);

  if (data.totalHits === 0) {
    console.log('  No rule hit data found. Run VGuard hooks first to collect data.');
    console.log('  Data is recorded automatically when hooks execute.\n');
    return;
  }

  const markdown = generateMarkdownReport(data);
  const outputPath = await saveReport(markdown, projectRoot);

  console.log(`  Report saved to ${outputPath}`);
  console.log(`  Total rule executions: ${data.totalHits}`);
  console.log(`  Technical debt score: ${data.debtScore}/100\n`);
}
