import type { AppSettings } from '$lib/domain/types';
import { loadSecret } from '$lib/storage/crypto';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chatCompletion(settings: AppSettings, messages: ChatMessage[]): Promise<string> {
  const llm = settings.llm;
  if (!llm) throw new Error('LLM non configuré (Paramètres).');
  const key = await loadSecret(llm.apiKeyHandle);
  if (!key) throw new Error('Clé API LLM introuvable.');
  const base = llm.baseUrl.replace(/\/+$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: llm.model,
      messages,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })
  });
  if (!res.ok) {
    const detail = await res.text().then((t) => t.slice(0, 200));
    throw new Error(`LLM : HTTP ${res.status} — ${detail}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content) throw new Error('Réponse LLM vide.');
  return content;
}
