import { useCallback, useSyncExternalStore } from 'react';
import {
  FaceQuizAnswers,
  INITIAL_FACE_ANSWERS,
  QuizZone,
} from '@/types/quiz';

const STORAGE_KEY = 'miraflores_quiz';

interface QuizState {
  zone: QuizZone | null;
  face: FaceQuizAnswers;
}

const defaultState: QuizState = {
  zone: null,
  face: { ...INITIAL_FACE_ANSWERS },
};

let state: QuizState = loadState();
const listeners = new Set<() => void>();

function loadState(): QuizState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState, face: { ...INITIAL_FACE_ANSWERS } };
    const parsed = JSON.parse(raw) as QuizState;
    return {
      zone: parsed.zone ?? null,
      face: { ...INITIAL_FACE_ANSWERS, ...parsed.face },
    };
  } catch {
    return { ...defaultState, face: { ...INITIAL_FACE_ANSWERS } };
  }
}

function persist() {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function useQuizState() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setZone = useCallback((zone: QuizZone) => {
    state = { ...state, zone };
    persist();
    emit();
  }, []);

  const updateFace = useCallback((patch: Partial<FaceQuizAnswers>) => {
    state = { ...state, face: { ...state.face, ...patch } };
    persist();
    emit();
  }, []);

  const resetQuiz = useCallback(() => {
    state = { zone: null, face: { ...INITIAL_FACE_ANSWERS } };
    persist();
    emit();
  }, []);

  return {
    zone: snapshot.zone,
    faceAnswers: snapshot.face,
    setZone,
    updateFace,
    resetQuiz,
  };
}
