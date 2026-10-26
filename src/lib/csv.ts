export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < src.length; i += 1) {
    const char = src[i];
    if (quoted) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((item) => item.some((value) => value.trim() !== ""));
}

export function csvRecords(text: string) {
  const rows = parseCsv(text);
  if (rows.length === 0) return { headers: [] as string[], records: [] as Record<string, string>[] };
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const records = rows.slice(1).map((row, index) => {
    const record: Record<string, string> = { __line: String(index + 2) };
    headers.forEach((header, cellIndex) => {
      record[header] = (row[cellIndex] ?? "").trim();
    });
    return record;
  });
  return { headers, records };
}
