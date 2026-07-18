import readline from 'readline';
import { chat, setModel, getModel } from './openrouter.js';
import { executeToolCall } from './tools.js';
import { MODELS, SYSTEM_PROMPT, TOOL_DEFINITIONS } from './config.js';
import { style } from './ui.js';

const MAX_HISTORY = 20;

function ts() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function wrap(text, w) {
  if (!text) return [''];
  const out = [];
  for (let line of text.split('\n')) {
    while (line.length > w) {
      let idx = line.lastIndexOf(' ', w);
      if (idx <= 0) idx = w;
      out.push(line.slice(0, idx));
      line = line.slice(idx).trim();
    }
    out.push(line);
  }
  return out;
}

let thinkingTimer = null;
function thinkStart(line) {
  const dots = ['  ', '. ', '..', ' .'];
  let i = 0;
  process.stdout.write(`\n ${style.dim}\u25B6 ${line}${style.reset}`);
  thinkingTimer = setInterval(() => {
    process.stdout.write(`\r ${style.dim}\u25B6 ${line}${style.cyan}${dots[i]}${style.reset}`);
    i = (i + 1) % dots.length;
  }, 250);
}
function thinkStop() {
  if (thinkingTimer) {
    clearInterval(thinkingTimer);
    thinkingTimer = null;
    process.stdout.write(`\r${' '.repeat(process.stdout.columns || 60)}\r`);
  }
}

function selectModel() {
  const maxId = Math.max(...MODELS.map(m => m.id.length));
  const bw = Math.max(44, maxId + 28);
  console.log(`\n ${style.bold}${style.cyan}\u2554${'\u2550'.repeat(bw - 2)}\u2557${style.reset}`);
  console.log(` \u2551${' '.repeat(Math.floor((bw - 14) / 2))}${style.bold}${style.cyan}\u2699 Models${style.reset}${' '.repeat(Math.ceil((bw - 14) / 2))}\u2551`);
  console.log(` \u2551${'\u2550'.repeat(bw - 2)}\u2551`);
  MODELS.forEach((m, i) => {
    const n = `${i + 1}`.padStart(2);
    const pad = i === 6 ? style.green : style.cyan;
    console.log(` \u2551 ${pad}${n}${style.reset}  ${m.name.padEnd(22)} ${style.dim}${m.id.padEnd(maxId)}${style.reset} \u2551`);
  });
  const q = MODELS.length + 1;
  console.log(` \u2551 ${style.yellow}${String(q).padStart(2)}${style.reset}  ${style.yellow}Quit${style.reset}${' '.repeat(bw - 8)}\u2551`);
  console.log(` \u255A${'\u2550'.repeat(bw - 2)}\u255D`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(r => {
    rl.question(`\n ${style.bold}${style.cyan}\u279c Model${style.reset} (1-${q}, Enter=7): `, a => {
      rl.close();
      const i = a.trim() ? parseInt(a) - 1 : 6;
      if (i >= 0 && i < MODELS.length) {
        setModel(MODELS[i].id);
        console.log(`\n ${style.green}\u2713 ${style.bold}${MODELS[i].name}${style.reset} ${style.dim}${MODELS[i].id}${style.reset}\n`);
        r(true);
      } else r(false);
    });
  });
}

function cmdBox(items, title) {
  console.log(`\n ${style.bold}${style.cyan}\u250c ${title}${style.reset}`);
  console.log(` ${style.dim}\u2502${style.reset}`);
  for (const [cmd, desc] of items) {
    console.log(` ${style.dim}\u2502${style.reset}  ${style.cyan}${cmd}${' '.repeat(8 - cmd.length)}${style.dim}\u2500\u2500${style.reset}  ${desc}`);
  }
  console.log(` ${style.dim}\u2514${'\u2500'.repeat(44)}${style.reset}`);
}

function help() {
  cmdBox([
    ['/model', 'Switch AI model'],
    ['/clear', 'Clear history'],
    ['/exit', 'Exit'],
    ['/help', 'Show this'],
    ['/debug', 'Toggle debug'],
  ], 'Commands');
  console.log(`\n ${style.bold}${style.yellow}\u250c Tips${style.reset}`);
  console.log(` ${style.dim}\u2502${style.reset}`);
  for (const t of ['Describe what to build or fix', 'AI reads/writes files, runs commands', 'AI searches web for fresh info']) {
    console.log(` ${style.dim}\u2502${style.reset}  ${style.dim}\u2139${style.reset}  ${t}`);
  }
  console.log(` ${style.dim}\u2514${'\u2500'.repeat(44)}${style.reset}`);
}

function fmtArgs(name, a) {
  switch (name) {
    case 'read_file':   return `${style.underline}${a.path}${style.reset}${a.offset ? ':' + a.offset : ''}`;
    case 'write_file':  return `${style.underline}${a.path}${style.reset}`;
    case 'edit_file':   return `${style.underline}${a.path}${style.reset}`;
    case 'bash':        return `${style.dim}$ ${style.reset}${a.command}`;
    case 'glob':        return `${style.dim}\u2731 ${style.reset}${a.pattern}`;
    case 'grep':        return `${style.dim}\u2666 ${style.reset}/${a.pattern}/${a.include || ''}`;
    case 'web_search':  return `${style.dim}\u2316 ${style.reset}${a.query}`;
    case 'web_fetch':   return `${style.dim}\u2191 ${style.reset}${a.url}`;
    default: return '';
  }
}

function fmtResult(name, out) {
  if (!out) return '(empty)';
  const lines = out.split('\n');
  if (lines.length > 8) {
    return lines.slice(0, 8).join('\n') + `\n ${style.dim}\u22EF ${lines.length - 8} more${style.reset}`;
  }
  return out;
}

export async function startChat() {
  console.clear();
  const bw = Math.min(54, process.stdout.columns - 2 || 54);
  console.log(`\n ${style.cyan}\u2554${'\u2550'.repeat(bw - 2)}\u2557`);
  console.log(` \u2551${' '.repeat(Math.floor((bw - 34) / 2))}${style.bold}\u2728  AI Agent Termux  \u2728${style.reset}${style.cyan}${' '.repeat(Math.ceil((bw - 34) / 2))}\u2551`);
  console.log(` \u2551${' '.repeat(Math.floor((bw - 22) / 2))}${style.dim}Free AI Coding Assistant${style.reset}${style.cyan}${' '.repeat(Math.ceil((bw - 22) / 2))}\u2551`);
  console.log(` \u255A${'\u2550'.repeat(bw - 2)}\u255D${style.reset}\n`);

  const ok = await selectModel();
  if (!ok) { console.log(`\n ${style.yellow}\u2728  Goodbye!${style.reset}\n`); return; }

  let msgs = [{ role: 'system', content: SYSTEM_PROMPT }];
  let debug = false;

  help();
  console.log(`\n ${style.dim}${'\u2500'.repeat(bw)}${style.reset}`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '' });

  function prompt() {
    const m = getModel().split('/')[1]?.split(':')[0] || getModel().split(':')[0];
    const d = process.cwd().split('\\').pop();
    process.stdout.write(`\n ${style.dim}${ts()}${style.reset} ${style.bold}${style.green}\u2770 you${style.reset} ${style.dim}@ ${d}${style.reset}\n`);
    process.stdout.write(` ${style.cyan}\u2570\u2500\u2771${style.reset} `);
  }

  prompt();

  for await (const line of rl) {
    const input = line.trim();
    if (!input) { prompt(); continue; }

    if (input === '/exit' || input === '/quit') { console.log(`\n ${style.yellow}\u2728  Goodbye!${style.reset}\n`); process.exit(0); }
    if (input === '/clear') { msgs = [{ role: 'system', content: SYSTEM_PROMPT }]; console.log(`\n ${style.green}\u2713  cleared${style.reset}\n`); prompt(); continue; }
    if (input === '/help') { help(); prompt(); continue; }
    if (input === '/model') { rl.pause(); const ok = await selectModel(); if (!ok) { console.log(`\n ${style.yellow}\u2728  Goodbye!${style.reset}\n`); process.exit(0); } rl.resume(); prompt(); continue; }
    if (input === '/debug') { debug = !debug; console.log(`\n ${style.yellow}\u25C9  debug: ${debug ? style.green + 'ON' : style.red + 'OFF'}${style.reset}\n`); prompt(); continue; }

    msgs.push({ role: 'user', content: input });

    let turns = 0;

    while (turns < 10) {
      turns++;
      let content = '';
      let toolCalls = [];
      let cur = null;

      const mShort = getModel().split('/')[1]?.split(':')[0] || getModel();

      thinkStart(`\u2771 ${mShort}`);

      const resp = await chat(msgs, TOOL_DEFINITIONS, (d) => {
        if (d.content) {
          if (!content) {
            thinkStop();
            process.stdout.write(`\n ${style.bold}${style.blue}\u2771 ${mShort}${style.reset} ${style.dim}${ts()}${style.reset}\n`);
          }
          process.stdout.write(d.content);
          content += d.content;
        }
        if (d.tool_calls) {
          for (const tc of d.tool_calls) {
            if (tc.id) { if (cur) toolCalls.push(cur); cur = { id: tc.id, fn: { name: tc.function?.name || '', args: tc.function?.arguments || '' } }; }
            else if (cur && tc.function) {
              if (tc.function.name) cur.fn.name += tc.function.name;
              if (tc.function.arguments) cur.fn.arguments += tc.function.arguments;
            }
          }
        }
      });

      thinkStop();

      if (cur) toolCalls.push(cur);

      if (resp?.choices?.[0]?.message) {
        const m = resp.choices[0].message;
        if (m.content && !content) content = m.content;
        if (m.tool_calls && !toolCalls.length) toolCalls = m.tool_calls;
      }

      if (!toolCalls.length) {
        if (content) {
          msgs.push({ role: 'assistant', content });
          const sepLen = Math.min(36, process.stdout.columns - 4 || 36);
          process.stdout.write(` ${style.dim}${'\u2500'.repeat(sepLen)}${style.reset}\n`);
        }
        break;
      }

      msgs.push({ role: 'assistant', content: content || null, tool_calls: toolCalls });
      const sepLen = Math.min(36, process.stdout.columns - 4 || 36);
      process.stdout.write(`\n ${style.dim}${'\u2500'.repeat(sepLen)}${style.reset}\n`);

      for (const tc of toolCalls) {
        const a = JSON.parse(tc.fn.args);
        const d = fmtArgs(tc.fn.name, a);
        const t0 = Date.now();

        process.stdout.write(` ${style.yellow}\u25B7${style.reset} ${style.bold}${tc.fn.name}${style.reset} ${d}`);
        process.stdout.write(`  ${style.dim}...${style.reset}\r`);
        process.stdout.write(` ${style.yellow}\u25B7${style.reset} ${style.bold}${tc.fn.name}${style.reset} ${d}`);

        const r = await executeToolCall({ id: tc.id, function: { name: tc.fn.name, arguments: tc.fn.args } });
        const elapsed = Date.now() - t0;

        process.stdout.write(`  ${style.dim}${elapsed}ms${style.reset} ${style.green}\u2713${style.reset}\n`);

        const out = fmtResult(tc.fn.name, r.output);
        for (const l of out.split('\n')) {
          process.stdout.write(`  ${style.dim}\u2502${style.reset} ${l}\n`);
        }

        const trunc = r.output.length > 1000 ? r.output.slice(0, 1000) + `\n... (${r.output.length} chars)` : r.output;
        msgs.push({ role: 'tool', tool_call_id: tc.id, content: trunc });
      }

      process.stdout.write(` ${style.dim}${'\u2500'.repeat(sepLen)}${style.reset}\n`);

      if (msgs.length > MAX_HISTORY * 2) {
        const sys = msgs[0];
        msgs = [sys, ...msgs.slice(-MAX_HISTORY * 2)];
      }
    }

    if (turns >= 10) process.stdout.write(`\n ${style.red}\u26A0  max turns${style.reset}\n`);

    prompt();
  }
}
