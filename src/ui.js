export const style = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

export function box(title, lines) {
  const stripped = title.replace(/\x1b\[\d+m/g, '');
  const lineStripped = lines.map(l => l.replace(/\x1b\[\d+m/g, ''));
  const w = Math.max(stripped.length, ...lineStripped.map(l => l.length)) + 4;
  const result = [` \u2554${'\u2550'.repeat(w - 2)}\u2557`];
  result.push(` \u2551 ${title.padEnd(w - 4)} \u2551`);
  result.push(` \u2551${'\u2550'.repeat(w - 2)}\u2551`);
  for (const line of lines) {
    result.push(` \u2551 ${line.padEnd(w - 4)} \u2551`);
  }
  result.push(` \u255A${'\u2550'.repeat(w - 2)}\u255D`);
  return result.join('\n');
}

export function divider(char = '─', len = 50) {
  return ` ${style.dim}${char.repeat(len)}${style.reset}`;
}

export function statusBadge(type, text) {
  const icons = {
    ok: '??',
    fail: '??',
    wait: '??',
    info: '??',
    tool: '??',
    think: '??',
  };
  const colors = {
    ok: style.green,
    fail: style.red,
    wait: style.yellow,
    info: style.blue,
    tool: style.yellow,
    think: style.magenta,
  };
  return `${colors[type] || style.cyan}${icons[type] || '??'}${style.reset} ${text}`;
}

export function timed(fn) {
  const start = Date.now();
  const result = fn();
  const ms = Date.now() - start;
  return { result, ms };
}

export async function asyncTimed(fn) {
  const start = Date.now();
  const result = await fn();
  const ms = Date.now() - start;
  return { result, ms };
}

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerInterval = null;
let spinnerRunning = false;

export function startSpinner(text = '') {
  if (spinnerRunning) return;
  spinnerRunning = true;
  let i = 0;
  process.stdout.write(` ${style.cyan}${FRAMES[i]}${style.reset} ${text}`);
  spinnerInterval = setInterval(() => {
    i = (i + 1) % FRAMES.length;
    process.stdout.write(`\r ${style.cyan}${FRAMES[i]}${style.reset} ${text}`);
  }, 80);
}

export function stopSpinner(text = '') {
  if (spinnerRunning) {
    clearInterval(spinnerInterval);
    spinnerRunning = false;
    process.stdout.write(`\r${' '.repeat(60)}\r`);
    if (text) process.stdout.write(text + '\n');
  }
}
