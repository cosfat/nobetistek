export const TURKISH_DAYS_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
export const TURKISH_DAYS_ORDERED = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']; // Monday first

export const TURKISH_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export function formatDateTR(dateStr: string, includeDayName = true): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  const monthName = TURKISH_MONTHS[date.getMonth()];
  const dayName = TURKISH_DAYS_SHORT[date.getDay()];
  if (includeDayName) {
    return `${day} ${monthName} ${year}, ${dayName}`;
  }
  return `${day} ${monthName} ${year}`;
}

export function formatShortDateTR(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  const dayName = TURKISH_DAYS_SHORT[date.getDay()];
  return `${day} ${TURKISH_MONTHS[date.getMonth()].slice(0, 3)} (${dayName})`;
}

export function isWeekend(dateStr: string): boolean {
  if (!dateStr) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
}

export function getDayOfWeekIndexMondayFirst(dateStr: string): number {
  if (!dateStr) return 0;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  const dayOfWeek = date.getDay(); // 0 is Sun, 1 is Mon
  return dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0 is Mon, 6 is Sun
}

// Timezone-safe local calendar date generator (prevents UTC date shifts)
export function getDatesBetween(startDate: string, endDate: string): string[] {
  if (!startDate || !endDate) return [];
  const dates: string[] = [];
  const [sY, sM, sD] = startDate.split('-').map(Number);
  const [eY, eM, eD] = endDate.split('-').map(Number);

  // Set time to 12:00:00 (noon) to eliminate daylight saving time (DST) shifts
  const current = new Date(sY, sM - 1, sD, 12, 0, 0);
  const end = new Date(eY, eM - 1, eD, 12, 0, 0);

  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Download content as CSV with UTF-8 BOM
export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
