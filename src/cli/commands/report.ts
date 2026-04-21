import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { aggregateReport } from '../../report/aggregator.js';
import { generateMarkdownReport, saveReport } from '../../report/markdown.js';
import { printBanner } from '../ui/banner.js';
import { color } from '../ui/colors.js';
import { glyph } from '../ui/glyphs.js';
import { info } from '../ui/log.js';

export async function reportCommand(options?: { output?: string; format?: string }): Promise<void> {
  const projectRoot = process.cwd();

  printBanner('Report', 'Generating quality dashboard');

  const data = aggregateReport(projectRoot);

  if (data.totalHits === 0) {
    info(color.dim('  No rule hit data found. Run VGuard hooks first to collect data.'));
    info(color.dim('  Data is recorded automatically when hooks execute.\n'));
    return;
  }

  const format = options?.format ?? 'md';

  if (format === 'json') {
    const json = JSON.stringify(data, null, 2);

    if (options?.output) {
      await mkdir(dirname(options.output), { recursive: true });
      await writeFile(options.output, json, 'utf-8');
      info(`  ${color.green(glyph('pass'))} Report saved to ${options.output}`);
    } else {
      process.stdout.write(json + '\n');
    }
    return;
  }

  const markdown = generateMarkdownReport(data);

  if (options?.output) {
    await mkdir(dirname(options.output), { recursive: true });
    await writeFile(options.output, markdown, 'utf-8');
    info(`  ${color.green(glyph('pass'))} Report saved to ${options.output}`);
  } else {
    const outputPath = await saveReport(markdown, projectRoot);
    info(`  ${color.green(glyph('pass'))} Report saved to ${outputPath}`);
  }

  info(`  ${color.bold('Total rule executions:')} ${data.totalHits}`);

  const score = data.debtScore;
  const scoreColor = score >= 80 ? color.green : score >= 50 ? color.yellow : color.red;
  info(`  ${color.bold('Technical debt score:')}  ${scoreColor(`${score}/100`)}\n`);
}
