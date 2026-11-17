/**
 * Returns YYYY-MM-DD date string for a Date in the given IANA timezone.
 */
function getDateKeyInTimezone(date = new Date(), timeZone = 'UTC') {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // YYYY-MM-DD
  } catch (_) {
    return new Date(date).toISOString().slice(0, 10);
  }
}

/**
 * Returns { hours, minutes } in the given IANA timezone for a UTC Date.
 */
function getTimePartsInTimezone(date = new Date(), timeZone = 'UTC') {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const hours = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minutes = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    return { hours: hours === 24 ? 0 : hours, minutes };
  } catch (_) {
    const d = new Date(date);
    return { hours: d.getUTCHours(), minutes: d.getUTCMinutes() };
  }
}

function parseTimeStringToMinutes(timeStr = '09:00') {
  const [h, m] = String(timeStr).split(':').map((v) => parseInt(v, 10) || 0);
  return h * 60 + m;
}

module.exports = {
  getDateKeyInTimezone,
  getTimePartsInTimezone,
  parseTimeStringToMinutes,
};
