/**
 * Timezone Utility — Asia/Kolkata (IST = UTC+05:30)
 * Handles calendar day boundaries and date conversions accurately for restaurant reporting.
 * India does NOT observe Daylight Saving Time (DST); offset is always +330 minutes (+5:30).
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 19,800,000 ms

/**
 * Returns current Date in IST
 * @returns {Date}
 */
const getNowIST = () => {
  const now = new Date();
  return new Date(now.getTime() + IST_OFFSET_MS);
};

/**
 * Converts a UTC Date object to an IST YYYY-MM-DD string
 * @param {Date} date
 * @returns {string} YYYY-MM-DD
 */
const toISTDateString = (date = new Date()) => {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  return istDate.toISOString().slice(0, 10);
};

/**
 * Validates whether a string is a valid YYYY-MM-DD date
 * @param {string} str
 * @returns {boolean}
 */
const isValidDateString = (str) => {
  if (!str || typeof str !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(str)) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
};

/**
 * Calculates start (00:00:00.000 IST) and end (23:59:59.999 IST) in UTC for a given YYYY-MM-DD in IST.
 * 
 * Example: 2026-11-23 IST
 * Start: 2026-11-23 00:00:00 IST -> 2026-11-22 18:30:00.000 UTC
 * End:   2026-11-23 23:59:59 IST -> 2026-11-23 18:29:59.999 UTC
 * 
 * @param {string} dateString - 'YYYY-MM-DD'
 * @returns {{ startUTC: Date, endUTC: Date, dateString: string }}
 */
const getISTDayRange = (dateString) => {
  const targetDate = isValidDateString(dateString) ? dateString : toISTDateString();
  const [year, month, day] = targetDate.split('-').map(Number);

  // Midnight IST in UTC: year, month-1, day, minus 5 hours 30 mins
  const startUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - IST_OFFSET_MS);
  const endUTC = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - IST_OFFSET_MS);

  return { startUTC, endUTC, dateString: targetDate };
};

/**
 * Calculates start and end UTC dates for a range of IST dates [startDateStr, endDateStr]
 * @param {string} startDateStr - 'YYYY-MM-DD'
 * @param {string} endDateStr - 'YYYY-MM-DD'
 * @returns {{ startUTC: Date, endUTC: Date, startDate: string, endDate: string }}
 */
const getISTDateRange = (startDateStr, endDateStr) => {
  const start = isValidDateString(startDateStr) ? startDateStr : toISTDateString();
  const end = isValidDateString(endDateStr) ? endDateStr : start;

  const { startUTC } = getISTDayRange(start);
  const { endUTC } = getISTDayRange(end);

  // Ensure start is before or equal to end
  if (startUTC > endUTC) {
    return {
      startUTC: endUTC,
      endUTC: startUTC,
      startDate: end,
      endDate: start,
    };
  }

  return { startUTC, endUTC, startDate: start, endDate: end };
};

/**
 * Returns exact start and end ranges for Today and Yesterday in IST
 * @returns {{ today: object, yesterday: object }}
 */
const getTodayAndYesterdayIST = () => {
  const todayStr = toISTDateString();
  const todayRange = getISTDayRange(todayStr);

  // Calculate Yesterday in IST
  const now = new Date();
  const yesterdayDate = new Date(now.getTime() + IST_OFFSET_MS - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);
  const yesterdayRange = getISTDayRange(yesterdayStr);

  return { today: todayRange, yesterday: yesterdayRange };
};

/**
 * Returns an array of the last N days in IST (default 7 days) ending today
 * @param {number} days - default 7
 * @returns {Array<{ date: string, label: string, startUTC: Date, endUTC: Date }>}
 */
const getLastNDaysIST = (days = 7) => {
  const result = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() + IST_OFFSET_MS - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    const range = getISTDayRange(dateStr);
    
    // Label e.g. "Mon 23/11"
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[d.getUTCDay()];
    const label = `${dayName} ${d.toISOString().slice(8, 10)}/${d.toISOString().slice(5, 7)}`;

    result.push({
      date: dateStr,
      label,
      startUTC: range.startUTC,
      endUTC: range.endUTC,
    });
  }

  return result;
};

module.exports = {
  IST_OFFSET_MS,
  getNowIST,
  toISTDateString,
  isValidDateString,
  getISTDayRange,
  getISTDateRange,
  getTodayAndYesterdayIST,
  getLastNDaysIST,
};
