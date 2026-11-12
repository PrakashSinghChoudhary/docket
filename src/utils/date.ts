/**
 * Date utility helpers for Daily Tasks and Monthly Archives
 */

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatFriendlyDate(dateStr: string): string {
  const todayStr = getLocalDateString();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterdayDate);

  if (dateStr === todayStr) {
    return 'Today';
  }
  if (dateStr === yesterdayStr) {
    return 'Yesterday';
  }

  const d = parseDateString(dateStr);
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatMonthHeader(dateStr: string): string {
  const d = parseDateString(dateStr);
  return d.toLocaleDateString([], { month: 'long', year: 'numeric' });
}

export function getDaysOfWeek(centerDateStr: string): string[] {
  const center = parseDateString(centerDateStr);
  const dayOfWeek = center.getDay(); // 0 is Sunday
  // Normalize to Monday as first day (0 = Mon, 6 = Sun)
  const mondayOffset = (dayOfWeek + 6) % 7;

  const monday = new Date(center);
  monday.setDate(center.getDate() - mondayOffset);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(getLocalDateString(d));
  }
  return days;
}

export function getMonthDays(year: number, monthZeroIndexed: number): string[] {
  const days: string[] = [];
  const daysInMonth = new Date(year, monthZeroIndexed + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const month = String(monthZeroIndexed + 1).padStart(2, '0');
    const day = String(d).padStart(2, '0');
    days.push(`${year}-${month}-${day}`);
  }
  return days;
}

