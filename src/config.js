export const API_KEY = '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';
export const BASE_URL = 'https://openrouter.ai/api/v1';

export const MODELS = [
  { id: 'tencent/hy3:free', name: 'Tencent Hy3' },
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron Ultra' },
  { id: 'poolside/laguna-m.1:free', name: 'Laguna M1' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron Super' },
  { id: 'cohere/north-mini-code:free', name: 'Cohere North Mini' },
  { id: 'poolside/laguna-xs-2.1:free', name: 'Laguna XS' },
  { id: 'nvidia/nemotron-3-nano-30b-a3b:free', name: 'Nemotron Nano' },
  { id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', name: 'Nemotron Nano Omni' },
  { id: 'openai/gpt-oss-20b:free', name: 'GPT OSS 20B' },
  { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B' },
];

export const SYSTEM_PROMPT = `You are an AI coding assistant running on Windows in a CLI terminal (PowerShell).
You have access to tools that let you read, write, and edit files, execute shell commands, and search code.

## Available tools

### read_file(path, offset?, limit?)
Read a file's contents. Returns lines with line numbers.

### write_file(path, content)
Create or overwrite a file with the given content.

### edit_file(path, old_string, new_string)
Make exact string replacements in a file. Read a file before editing it.

### bash(command)
Execute a command using PowerShell. Use PowerShell syntax (e.g., "dir" instead of "ls", "Get-Content" instead of "cat").

### glob(pattern)
Search for files matching a glob pattern (e.g. "**/*.js").

### grep(pattern, include?)
Search file contents with a regex pattern. Optionally filter by file extension.

### web_search(query)
Search the web for up-to-date information.

### web_fetch(url)
Fetch and read the content of a URL.

## Rules
- Read a file before suggesting edits to it.
- When creating new files, prefer write_file.
- When modifying existing files, use edit_file for precise edits.
- Run linting/typecheck commands after making changes.
- Be concise. Explain actions briefly.
- Work in the user's current working directory.
- Use PowerShell syntax for all commands.
- NEVER use emojis or emoticons in your responses. Text only.
- Use triple backticks for code blocks.`;

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to the file' },
          offset: { type: 'number', description: 'Line number to start from (1-indexed)' },
          limit: { type: 'number', description: 'Max lines to read' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Create or overwrite a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path' },
          content: { type: 'string', description: 'File content' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description: 'Replace text in an existing file (read it first)',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path' },
          old_string: { type: 'string', description: 'Text to replace' },
          new_string: { type: 'string', description: 'Replacement text' },
        },
        required: ['path', 'old_string', 'new_string'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bash',
      description: 'Execute a shell command',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'PowerShell command to run' },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'glob',
      description: 'Find files by glob pattern',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Glob pattern (e.g. **/*.js)' },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'grep',
      description: 'Search file contents with a regex',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regex pattern' },
          include: { type: 'string', description: 'File extension filter (e.g. *.js)' },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for information',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_fetch',
      description: 'Fetch a URL and return its content',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to fetch' },
        },
        required: ['url'],
      },
    },
  },
];
