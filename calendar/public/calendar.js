/**
 * The reference artwork. Change `month` or pass ?month=YYYY-MM to show another month.
 * Add highlights with repeated ?highlight=day:color[:style] parameters.
 */
const reference = {
  month: '2026-10',
  highlights: {
    7: { color: 'violet' },
    11: { color: 'blue' },
    14: { color: 'orange' },
    18: { color: 'red' },
    21: { color: 'green' },
    25: { color: 'yellow' },
    28: { color: 'pink' },
    30: { color: 'mint' },
  },
};

const params = new URLSearchParams(window.location.search);
const requestedMonth = params.get('month');
const month = /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(requestedMonth ?? '')
  ? requestedMonth
  : reference.month;

const [year, monthNumber] = month.split('-').map(Number);
const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
const firstWeekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
const monthName = new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' })
  .format(new Date(Date.UTC(year, monthNumber - 1, 1)));
const highlights = month === reference.month && params.get('highlights') !== 'none'
  ? { ...reference.highlights }
  : {};

for (const value of params.getAll('highlight')) {
  const match = /^(\d{1,2}):([a-z-]+)(?::([a-z-]+))?$/.exec(value);
  if (!match) continue;
  const day = Number(match[1]);
  const [, , color, style = 'spot'] = match;
  if (day >= 1 && day <= daysInMonth && /^(violet|blue|orange|red|green|yellow|pink|mint)$/.test(color)
      && /^(spot|ring|underline)$/.test(style)) {
    highlights[day] = { color, style };
  }
}

document.title = `${monthName} ${year} — Presence House`;
document.querySelector('#edition-month').textContent = String(monthNumber).padStart(2, '0');
document.querySelector('#edition-year').textContent = `‘${String(year).slice(-2)}`;
document.querySelector('#month-name').textContent = monthName.slice(0, 3).toUpperCase();
document.querySelector('#calendar-caption').textContent = `${monthName} ${year}`;

const tbody = document.querySelector('#calendar-days');
const rowCount = Math.ceil((firstWeekday + daysInMonth) / 7);

for (let row = 0; row < rowCount; row += 1) {
  const tr = document.createElement('tr');
  for (let column = 0; column < 7; column += 1) {
    const day = row * 7 + column - firstWeekday + 1;
    const td = document.createElement('td');
    if (day >= 1 && day <= daysInMonth) {
      const time = document.createElement('time');
      time.dateTime = `${month}-${String(day).padStart(2, '0')}`;
      time.textContent = day;
      time.setAttribute('aria-label', `${monthName} ${day}, ${year}`);

      if (highlights[day]) {
        const { color, style = 'spot' } = highlights[day];
        time.dataset.decoration = style;
        time.dataset.color = color;
        // Deliberately irregular, but stable for every month and day.
        const seed = (year * 17 + monthNumber * 31 + day * 47) % 101;
        time.style.setProperty('--mark-x', `${((seed % 7) - 3) * 0.018}em`);
        time.style.setProperty('--mark-y', `${((seed % 9) - 4) * 0.013}em`);
        time.style.setProperty('--mark-turn', `${((seed % 13) - 6) * 1.4}deg`);
        time.style.setProperty('--mark-radius-a', `${46 + seed % 10}%`);
        time.style.setProperty('--mark-radius-b', `${46 + seed % 7}%`);
      }
      td.append(time);
    }
    tr.append(td);
  }
  tbody.append(tr);
}
