import { useSyncExternalStore } from 'react';
import { CalculatorSession } from './calculator-session';

/** The session belongs to the application; rendering only reads completed actions. */
export function useCalculator(session: CalculatorSession): CalculatorSession {
  useSyncExternalStore(session.subscribe, session.getSnapshot);
  return session;
}
