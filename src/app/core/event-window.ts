// Bonuses that only exist while an in-game event runs.
//
// The client marks them "[Durante o Evento]" and never says when the event ends, so the end
// date is written into the item script by hand — `UNTIL[2026-10-12]===50` — and the bonus is
// paid through that day and dropped after it. A build shared or saved during the event
// therefore simulates without the bonus once the event is over, which is what the game does.

/** The game server runs on Brasília time, so an event day is a São Paulo calendar day. */
const EVENT_TIME_ZONE = 'America/Sao_Paulo';

/** `en-CA` formats as `yyyy-mm-dd`, which compares correctly as a string. */
const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: EVENT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The São Paulo calendar day of an instant, as `yyyy-mm-dd`. */
export function eventDay(now: Date): string {
  return dayFormatter.format(now);
}

/** `UNTIL[yyyy-mm-dd]` in a script line: the clause to strip and the last day it pays. */
export function readUntilCondition(line: string): { clause: string; lastDay: string } | undefined {
  const [clause, lastDay] = line.match(/UNTIL\[(\d{4}-\d{2}-\d{2})]/) ?? [];
  return lastDay ? { clause, lastDay } : undefined;
}

/** Whether an event whose last day is `lastDay` is still running at `now` — the day itself included. */
export function isEventRunning(lastDay: string, now: Date): boolean {
  return eventDay(now) <= lastDay;
}
