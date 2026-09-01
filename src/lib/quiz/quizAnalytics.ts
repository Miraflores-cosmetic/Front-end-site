import { apiFetch } from '@/api/apiClient';

const SESSION_KEY = 'miraflores_quiz_analytics_session';
const DEDUPE_PREFIX = 'miraflores_quiz_evt:';

export type QuizAnalyticsType =
  | 'quiz_start'
  | 'zone_select'
  | 'step_view'
  | 'step_complete'
  | 'quiz_complete';

export type QuizAnalyticsZone = 'face' | 'hair';

type TrackPayload = {
  type: QuizAnalyticsType;
  zone?: QuizAnalyticsZone | null;
  stepKey?: string | null;
  meta?: Record<string, unknown> | null;
  /** Не слать повторно в рамках сессии вкладки (по type+zone+stepKey). */
  once?: boolean;
};

type QueuedEvent = {
  sessionId: string;
  type: QuizAnalyticsType;
  zone?: QuizAnalyticsZone | null;
  stepKey?: string | null;
  meta?: Record<string, unknown> | null;
};

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `q-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `q-${Date.now()}`;
  }
}

function dedupeKey(payload: TrackPayload): string {
  return `${payload.type}:${payload.zone ?? ''}:${payload.stepKey ?? ''}`;
}

function shouldSkipOnce(payload: TrackPayload): boolean {
  if (!payload.once) return false;
  try {
    const key = DEDUPE_PREFIX + dedupeKey(payload);
    if (sessionStorage.getItem(key)) return true;
    sessionStorage.setItem(key, '1');
    return false;
  } catch {
    return false;
  }
}

async function flushQueue() {
  if (flushing || queue.length === 0) return;
  flushing = true;
  const batch = queue.splice(0, 40);
  try {
    await apiFetch('quiz/events', {
      method: 'POST',
      skipAuth: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
    });
  } catch {
    // best-effort: не возвращаем в очередь, чтобы не заспамить при офлайне
  } finally {
    flushing = false;
    if (queue.length > 0) scheduleFlush(80);
  }
}

function scheduleFlush(delayMs = 400) {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushQueue();
  }, delayMs);
}

/** Fire-and-forget событие квиза. */
export function trackQuizEvent(payload: TrackPayload): void {
  if (typeof window === 'undefined') return;
  if (shouldSkipOnce(payload)) return;

  queue.push({
    sessionId: getSessionId(),
    type: payload.type,
    zone: payload.zone ?? null,
    stepKey: payload.stepKey ?? null,
    meta: payload.meta ?? null,
  });
  scheduleFlush();
}
