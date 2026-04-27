import { CalendarCell } from './types';

export const getMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

export const getMonthLabel = (date: Date) =>
  date.toLocaleDateString('ar-EG', {
    month: 'long',
    year: 'numeric',
  });

export const buildMonthCells = (
  monthDate: Date,
  completedDates: Set<string>,
): CalendarCell[] => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leadingEmpty = (firstDay.getDay() + 1) % 7;
  const totalDays = lastDay.getDate();
  const cells: CalendarCell[] = [];

  for (let i = 0; i < leadingEmpty; i++) {
    cells.push({
      key: `empty-start-${i}`,
      completed: false,
      today: false,
      empty: true,
    });
  }

  const todayIso = toIsoDate(new Date());

  for (let day = 1; day <= totalDays; day++) {
    const current = new Date(year, month, day);
    const isoDate = toIsoDate(current);
    cells.push({
      key: isoDate,
      dayNumber: day,
      isoDate,
      completed: completedDates.has(isoDate),
      today: isoDate === todayIso,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      key: `empty-end-${cells.length}`,
      completed: false,
      today: false,
      empty: true,
    });
  }

  return cells;
};
