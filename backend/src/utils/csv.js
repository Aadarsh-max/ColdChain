const FORMULA_START = /^[=+\-@\t\r]/;

export const csvCell = (value) => {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
};

export const csvRow = (values) => `${values.map(csvCell).join(',')}\r\n`;

export const toCsv = (columns, rows) =>
  csvRow(columns.map((column) => column.header)) +
  rows.map((row) => csvRow(columns.map((column) => column.value(row)))).join('');