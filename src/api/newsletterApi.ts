import { apiJson } from '@/api/apiClient';

export async function subscribeNewsletter(input: {
  email: string;
  name?: string;
  source?: string;
}): Promise<{ ok: true; email: string; alreadyUser: boolean }> {
  return apiJson('/newsletter/subscribe', 'POST', {
    email: input.email,
    name: input.name || undefined,
    source: input.source || 'homepage',
  });
}
