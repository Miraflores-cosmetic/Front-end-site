import { useEffect, useState, useCallback } from 'react';

/**
 * Хук обратного отсчёта
 * @param initialSeconds начальное количество секунд
 * @returns { timeLeft, reset, isFinished, formatTime }
 */
export const useCountdown = (initialSeconds: number) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  // уменьшение времени каждую секунду
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Сброс таймера
  const reset = useCallback(() => {
    setTimeLeft(initialSeconds);
  }, [initialSeconds]);

  // Формат M:SS
  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  return {
    timeLeft,
    reset,
    isFinished: timeLeft <= 0,
    formatTime
  };
};
