import { API_KEY, BASE_URL } from './config.js';

let currentModel = 'nvidia/nemotron-3-nano-30b-a3b:free';

export function setModel(modelId) {
  currentModel = modelId;
}

export function getModel() {
  return currentModel;
}

export async function chat(messages, tools = [], onChunk = null) {
  const body = {
    model: currentModel,
    messages,
    tools: tools.length > 0 ? tools : undefined,
    stream: onChunk ? true : false,
  };

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/ai-agent-termux',
      'X-Title': 'AI Agent Termux',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${err}`);
  }

  if (onChunk) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          if (delta) onChunk(delta, parsed);
        } catch { /* skip malformed chunks */ }
      }
    }
    return null;
  }

  const data = await response.json();
  return data;
}
