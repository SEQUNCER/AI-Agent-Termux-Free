import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

function isPathSafe(targetPath) {
  try {
    const resolved = path.resolve(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function executeToolCall(toolCall) {
  const { name, arguments: args } = toolCall.function;
  const parsed = JSON.parse(args);

  try {
    switch (name) {
      case 'read_file': {
        if (!isPathSafe(parsed.path)) return { tool_call_id: toolCall.id, output: 'Error: Invalid path' };
        const resolved = path.resolve(parsed.path);
        if (!fs.existsSync(resolved)) return { tool_call_id: toolCall.id, output: `Error: File not found: ${parsed.path}` };
        const stat = fs.statSync(resolved);
        if (stat.isDirectory()) {
          const entries = fs.readdirSync(resolved).map(e => {
            const full = path.join(resolved, e);
            return fs.statSync(full).isDirectory() ? `${e}/` : e;
          });
          return { tool_call_id: toolCall.id, output: entries.join('\n') };
        }
        const content = fs.readFileSync(resolved, 'utf-8');
        const lines = content.split('\n');
        const offset = parsed.offset || 1;
        const limit = parsed.limit || lines.length;
        const selected = lines.slice(offset - 1, offset - 1 + limit);
        const numbered = selected.map((l, i) => `${offset + i}: ${l}`).join('\n');
        const total = lines.length;
        const meta = `File: ${resolved} (${total} lines, showing ${offset}-${Math.min(offset + limit - 1, total)})`;
        return { tool_call_id: toolCall.id, output: `${meta}\n${numbered}` };
      }

      case 'write_file': {
        if (!isPathSafe(parsed.path)) return { tool_call_id: toolCall.id, output: 'Error: Invalid path' };
        const resolved = path.resolve(parsed.path);
        const dir = path.dirname(resolved);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(resolved, parsed.content, 'utf-8');
        return { tool_call_id: toolCall.id, output: `Written ${resolved}` };
      }

      case 'edit_file': {
        if (!isPathSafe(parsed.path)) return { tool_call_id: toolCall.id, output: 'Error: Invalid path' };
        const resolved = path.resolve(parsed.path);
        if (!fs.existsSync(resolved)) return { tool_call_id: toolCall.id, output: `Error: File not found: ${parsed.path}` };
        const content = fs.readFileSync(resolved, 'utf-8');
        if (!content.includes(parsed.old_string)) {
          return { tool_call_id: toolCall.id, output: `Error: old_string not found in ${resolved}` };
        }
        const newContent = content.replace(parsed.old_string, parsed.new_string);
        fs.writeFileSync(resolved, newContent, 'utf-8');
        return { tool_call_id: toolCall.id, output: `Edited ${resolved}` };
      }

      case 'bash': {
        try {
          const output = execSync(parsed.command, {
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
            timeout: 60000,
            shell: 'powershell.exe',
          });
          return { tool_call_id: toolCall.id, output: output || '(empty output)' };
        } catch (e) {
          return { tool_call_id: toolCall.id, output: `Exit code ${e.status}: ${e.stdout || ''}\n${e.stderr || ''}` };
        }
      }

      case 'glob': {
        const { globSync } = await import('glob');
        const matches = globSync(parsed.pattern, { dot: true });
        return { tool_call_id: toolCall.id, output: matches.join('\n') || '(no matches)' };
      }

      case 'grep': {
        const { globSync } = await import('glob');
        const pattern = parsed.pattern;
        const include = parsed.include || '**/*';
        const matches = globSync(include, { dot: true });
        const results = [];
        for (const file of matches.slice(0, 100)) {
          try {
            const content = fs.readFileSync(file, 'utf-8');
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].match(new RegExp(pattern, 'i'))) {
                results.push(`${file}:${i + 1}: ${lines[i].trim()}`);
              }
            }
          } catch { /* skip unreadable */ }
        }
        return { tool_call_id: toolCall.id, output: results.join('\n') || '(no matches)' };
      }

      case 'web_search': {
        try {
          const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(parsed.query)}&format=json&no_html=1&skip_disambig=1`;
          const resp = await fetch(url);
          const data = await resp.json();
          const results = [];
          if (data.AbstractText) results.push(data.AbstractText);
          if (data.RelatedTopics) {
            for (const topic of data.RelatedTopics.slice(0, 5)) {
              if (topic.Text) results.push(topic.Text);
              if (topic.Topics) topic.Topics.forEach(t => { if (t.Text) results.push(t.Text); });
            }
          }
          return { tool_call_id: toolCall.id, output: results.join('\n') || `No results for "${parsed.query}"` };
        } catch (e) {
          return { tool_call_id: toolCall.id, output: `Search error: ${e.message}` };
        }
      }

      case 'web_fetch': {
        try {
          const resp = await fetch(parsed.url);
          const text = await resp.text();
          const maxLen = 10000;
          return {
            tool_call_id: toolCall.id,
            output: text.length > maxLen ? text.slice(0, maxLen) + '\n... (truncated)' : text,
          };
        } catch (e) {
          return { tool_call_id: toolCall.id, output: `Fetch error: ${e.message}` };
        }
      }

      default:
        return { tool_call_id: toolCall.id, output: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { tool_call_id: toolCall.id, output: `Error executing ${name}: ${e.message}` };
  }
}
