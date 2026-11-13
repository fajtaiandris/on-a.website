// Replace this data object when the calendar is connected to an event source.
const calendar = {
  month: '2026-10',
  days: {
    7: {
      mark: { color: 'violet', listX: 0.04, listY: -0.08 },
      events: [
        { title: 'Legacy Senior Adults', time: '10:30', label: '10:30am' },
        { title: 'Presence House Students', time: '19:00', label: '7pm' },
      ],
    },
    11: {
      mark: { color: 'blue', listX: -0.02, listY: 0 },
      events: [{ title: 'Child Dedication & Pastors’ Welcome' }],
    },
    14: {
      mark: { color: 'orange', listX: -0.05, listY: 0.07 },
      events: [
        { title: 'Legacy Senior Adults', time: '10:30', label: '10:30am' },
        { title: 'Presence House Students', time: '19:00', label: '7pm' },
      ],
    },
    18: {
      mark: { color: 'red', listX: -0.15, listY: 0.02 },
      events: [{ title: 'Her Story, His Glory', time: '17:00', label: '5pm' }],
    },
    21: {
      mark: { color: 'green', listX: 0.03, listY: 0.03 },
      events: [
        { title: 'Legacy Senior Adults', time: '10:30', label: '10:30am' },
        { title: 'Presence House Students', time: '19:00', label: '7pm' },
      ],
    },
    25: {
      mark: { color: 'yellow', listX: -0.03, listY: 0.04 },
      events: [{ title: 'Water Baptism' }],
    },
    28: {
      mark: { color: 'pink', listX: 0.08, listY: 0.03 },
      events: [
        { title: 'Legacy Senior Adults', time: '10:30', label: '10:30am' },
        { title: 'Presence House Students', time: '19:00', label: '7pm' },
      ],
    },
    30: {
      mark: { color: 'mint', listX: 0.03, listY: 0.07 },
      events: [{ title: 'Fall, Faith & Flannel', time: '17:00', label: '5pm' }],
    },
  },
};

const [year, monthNumber] = calendar.month.split('-').map(Number);
const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
const firstWeekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
const monthName = new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' })
  .format(new Date(Date.UTC(year, monthNumber - 1, 1)));
const dateFor = (day) => calendar.month + '-' + String(day).padStart(2, '0');

function decorate(element, mark, day, inList = false) {
  if (!mark) return;
  element.dataset.decoration = mark.style ?? 'spot';
  element.dataset.color = mark.color;

  // The grid uses stable irregularity; the larger list marks have their own offsets.
  const seed = (year * 17 + monthNumber * 31 + day * 47) % 101;
  const x = inList ? mark.listX ?? 0 : ((seed % 7) - 3) * 0.018;
  const y = inList ? mark.listY ?? 0 : ((seed % 9) - 4) * 0.013;
  element.style.setProperty('--mark-x', x + 'em');
  element.style.setProperty('--mark-y', y + 'em');
  element.style.setProperty('--mark-turn', ((seed % 13) - 6) * 1.4 + 'deg');
  element.style.setProperty('--mark-radius-a', 46 + seed % 10 + '%');
  element.style.setProperty('--mark-radius-b', 46 + seed % 7 + '%');
}

document.title = monthName + ' ' + year + ' — Presence House';
document.querySelector('#edition-month').textContent = String(monthNumber).padStart(2, '0');
document.querySelector('#edition-year').textContent = '‘' + String(year).slice(-2);
document.querySelector('#month-name').textContent = monthName.slice(0, 3).toUpperCase();
document.querySelector('#calendar-caption').textContent = monthName + ' ' + year;

const tbody = document.querySelector('#calendar-days');
const rowCount = Math.ceil((firstWeekday + daysInMonth) / 7);

for (let row = 0; row < rowCount; row += 1) {
  const tr = document.createElement('tr');
  for (let column = 0; column < 7; column += 1) {
    const day = row * 7 + column - firstWeekday + 1;
    const td = document.createElement('td');
    if (day >= 1 && day <= daysInMonth) {
      const time = document.createElement('time');
      time.dateTime = dateFor(day);
      time.textContent = day;
      time.setAttribute('aria-label', monthName + ' ' + day + ', ' + year);
      decorate(time, calendar.days[day]?.mark, day);
      td.append(time);
    }
    tr.append(td);
  }
  tbody.append(tr);
}

const eventDays = document.querySelector('#event-days');
for (const [dayText, data] of Object.entries(calendar.days)) {
  if (!data.events?.length) continue;
  const day = Number(dayText);
  if (day < 1 || day > daysInMonth) continue;

  const item = document.createElement('li');
  const heading = document.createElement('h3');
  const date = document.createElement('time');
  date.dateTime = dateFor(day);
  date.textContent = day;
  date.setAttribute('aria-label', monthName + ' ' + day + ', ' + year);
  decorate(date, data.mark, day, true);
  heading.append(date);
  item.append(heading);

  const events = document.createElement('ul');
  for (const event of data.events) {
    const eventItem = document.createElement('li');
    const article = document.createElement('article');
    const title = document.createElement('h4');
    title.textContent = event.title;
    article.append(title);
    if (event.time) {
      const time = document.createElement('time');
      time.dateTime = dateFor(day) + 'T' + event.time;
      time.textContent = event.label ?? event.time;
      article.append(time);
    }
    eventItem.append(article);
    events.append(eventItem);
  }
  item.append(events);
  eventDays.append(item);
}
