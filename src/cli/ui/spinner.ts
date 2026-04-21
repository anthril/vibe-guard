import { isAsciiMode, isCI, isQuiet, isVerbose } from './env.js';

export interface Spinner {
  update(label: string): void;
  succeed(label?: string): void;
  fail(label?: string): void;
  stop(): void;
}

const unicodeFrames = [
  '\u280B',
  '\u2819',
  '\u2839',
  '\u2838',
  '\u283C',
  '\u2834',
  '\u2826',
  '\u2827',
  '\u2807',
  '\u280F',
];
const asciiFrames = ['|', '/', '-', '\\'];

function noopSpinner(): Spinner {
  return {
    update() {},
    succeed() {},
    fail() {},
    stop() {},
  };
}

export function startSpinner(initialLabel: string): Spinner {
  const stream = process.stderr;
  if (isQuiet()) return noopSpinner();

  const enabled = Boolean(stream.isTTY) && !isCI() && !isVerbose();
  let label = initialLabel;

  if (!enabled) {
    stream.write(`  ${label}...\n`);
    return {
      update(next: string) {
        label = next;
        stream.write(`  ${next}...\n`);
      },
      succeed(done?: string) {
        if (done) stream.write(`  ${done}\n`);
      },
      fail(err?: string) {
        if (err) stream.write(`  ${err}\n`);
      },
      stop() {},
    };
  }

  const frames = isAsciiMode() ? asciiFrames : unicodeFrames;
  let i = 0;
  let stopped = false;

  const render = () => {
    if (stopped) return;
    const frame = frames[i % frames.length];
    stream.write(`\r  ${frame} ${label}`);
    i += 1;
  };

  const timer = setInterval(render, 80);
  render();

  const clearLine = () => {
    stream.write('\r\x1b[2K');
  };

  return {
    update(next: string) {
      label = next;
    },
    succeed(done?: string) {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      clearLine();
      if (done) stream.write(`  ${done}\n`);
    },
    fail(err?: string) {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      clearLine();
      if (err) stream.write(`  ${err}\n`);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      clearLine();
    },
  };
}
