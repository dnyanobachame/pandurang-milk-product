// lib/admin-date-range.ts

export function getIndiaTodayRange() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('Unable to determine India date.');
  }

  const today = `${year}-${month}-${day}`;

  // India has no DST, so adding one calendar day is safe here.
  const nextDayDate = new Date(`${today}T00:00:00+05:30`);
  nextDayDate.setUTCDate(nextDayDate.getUTCDate() + 1);

  const nextDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(nextDayDate);

  return {
    today,
    start: `${today}T00:00:00+05:30`,
    end: `${nextDay}T00:00:00+05:30`,
  };
}