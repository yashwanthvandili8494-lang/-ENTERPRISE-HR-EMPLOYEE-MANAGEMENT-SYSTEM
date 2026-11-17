function escapeCsvField(value) {
  if (value === null || value === undefined) return '';
  let str = String(value);
  // Prevent CSV formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers, rows) {
  const headerLine = headers.map((h) => escapeCsvField(h.label)).join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCsvField(typeof h.value === 'function' ? h.value(row) : row[h.key])).join(',')
  );
  return [headerLine, ...dataLines].join('\r\n');
}

module.exports = { toCsv, escapeCsvField };
