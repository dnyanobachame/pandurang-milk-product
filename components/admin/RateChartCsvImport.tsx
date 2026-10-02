'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { importRateChartRows } from '@/app/actions/rate-chart-import';

type CsvRow = {
  rowNumber: number;
  milk_type: string;
  fat_percent: string;
  snf_percent: string;
  rate_per_litre: string;
  effective_from: string;
  error?: string;
};

const REQUIRED_HEADERS = [
  'milk_type',
  'fat_percent',
  'snf_percent',
  'rate_per_litre',
  'effective_from',
] as const;

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }

      continue;
    }

    if (char === ',' && !quoted) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error(
      'CSV must contain a header and at least one data row.'
    );
  }

  const headers = parseCsvLine(lines[0]).map((header) =>
    header.trim().toLowerCase()
  );

  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !headers.includes(header)
  );

  if (missingHeaders.length > 0) {
    throw new Error(
      `Missing required columns: ${missingHeaders.join(', ')}`
    );
  }

  const rows: CsvRow[] = [];

  lines.slice(1).forEach((line, index) => {
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};

    headers.forEach((header, headerIndex) => {
      record[header] = values[headerIndex] ?? '';
    });

    const milkType = record.milk_type.trim().toLowerCase();
    const fat = record.fat_percent.trim();
    const snf = record.snf_percent.trim();
    const rate = record.rate_per_litre.trim();
    const effectiveFrom = record.effective_from.trim();

    let error = '';

    if (milkType !== 'cow' && milkType !== 'buffalo') {
      error = 'Milk type must be cow or buffalo.';
    } else if (
      !fat ||
      !Number.isFinite(Number(fat)) ||
      Number(fat) < 0
    ) {
      error = 'Invalid FAT.';
    } else if (
      !snf ||
      !Number.isFinite(Number(snf)) ||
      Number(snf) < 0
    ) {
      error = 'Invalid SNF.';
    } else if (
      !rate ||
      !Number.isFinite(Number(rate)) ||
      Number(rate) < 0
    ) {
      error = 'Invalid rate.';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
      error = 'Effective date must be YYYY-MM-DD.';
    }

    rows.push({
      rowNumber: index + 2,
      milk_type: milkType,
      fat_percent: fat,
      snf_percent: snf,
      rate_per_litre: rate,
      effective_from: effectiveFrom,
      error: error || undefined,
    });
  });

  return rows;
}

function downloadTemplate() {
  const csv = [
    'milk_type,fat_percent,snf_percent,rate_per_litre,effective_from',
    'cow,3.50,8.50,38.00,2026-10-01',
    'cow,4.00,8.50,42.00,2026-10-01',
    'buffalo,6.00,9.00,55.00,2026-10-01',
  ].join('\n');

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = 'rate-chart-template.csv';
  anchor.click();

  URL.revokeObjectURL(url);
}

export default function RateChartCsvImport() {
  const router = useRouter();

  const [rows, setRows] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);

  const [result, setResult] = useState<{
    inserted: number;
    skipped: number;
    errors: number;
    details?: Array<{
      row: number;
      type: string;
      message: string;
    }>;
  } | null>(null);

  const validRows = useMemo(
    () => rows.filter((row) => !row.error),
    [rows]
  );

  const invalidRows = useMemo(
    () => rows.filter((row) => row.error),
    [rows]
  );

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setRows([]);
    setFileName('');
    setParseError('');
    setImportError('');
    setResult(null);

    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please select a .csv file.');
      event.target.value = '';
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = parseCsv(String(reader.result ?? ''));

        if (parsed.length > 5000) {
          setParseError(
            'A single import can contain at most 5,000 rows.'
          );
          return;
        }

        setRows(parsed);
      } catch (error) {
        setParseError(
          error instanceof Error
            ? error.message
            : 'Unable to read CSV.'
        );
      }
    };

    reader.onerror = () => {
      setParseError(
        'Unable to read the selected CSV file.'
      );
    };

    reader.readAsText(file);
  }

  async function handleImport() {
    if (validRows.length === 0 || importing) return;

    setImporting(true);
    setImportError('');
    setResult(null);

    try {
      const response = await importRateChartRows(
        validRows.map((row) => ({
          milk_type: row.milk_type,
          fat_percent: row.fat_percent,
          snf_percent: row.snf_percent,
          rate_per_litre: row.rate_per_litre,
          effective_from: row.effective_from,
        }))
      );

      if (!response.success) {
        setImportError(
          response.error ?? 'Import failed.'
        );
        return;
      }

      setResult({
        inserted: response.inserted ?? 0,
        skipped: response.skipped ?? 0,
        errors: response.errors ?? 0,
        details: response.details,
      });

      router.refresh();
    } catch (error) {
      console.error('RATE CSV IMPORT ERROR:', error);
      setImportError(
        'Unable to import the rate chart.'
      );
    } finally {
      setImporting(false);
    }
  }

  const hasRows = rows.length > 0;

  return (
    <section
      aria-labelledby="rate-chart-csv-title"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2
              id="rate-chart-csv-title"
              className="text-base font-semibold text-slate-900"
            >
              Import Rate Chart CSV
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Upload up to 5,000 rates. Existing active
              duplicates are skipped rather than overwritten.
            </p>
          </div>

          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-1 sm:w-auto"
          >
            Download Template
          </button>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <div>
          <label
            htmlFor="rate-chart-csv"
            className="mb-2 block text-sm font-semibold text-slate-800"
          >
            CSV file
          </label>

          <input
            id="rate-chart-csv"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            aria-describedby="rate-chart-csv-help"
            className="block min-h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition file:mr-4 file:min-h-8 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />

          <p
            id="rate-chart-csv-help"
            className="mt-2 text-xs leading-5 text-slate-500"
          >
            Select a CSV containing the required rate
            chart columns. Maximum 5,000 data rows.
          </p>

          {fileName && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <span
                aria-hidden="true"
                className="text-slate-400"
              >
                📄
              </span>

              <p className="min-w-0 truncate text-xs font-medium text-slate-600">
                Selected: {fileName}
              </p>
            </div>
          )}
        </div>

        {parseError && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
          >
            {parseError}
          </div>
        )}

        {hasRows && (
          <>
            <div
              aria-label="CSV validation summary"
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            >
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Rows
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {rows.length}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-medium text-emerald-700">
                  Valid
                </p>
                <p className="mt-1 text-xl font-bold text-emerald-800">
                  {validRows.length}
                </p>
              </div>

              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <p className="text-xs font-medium text-red-700">
                  Invalid
                </p>
                <p className="mt-1 text-xl font-bold text-red-800">
                  {invalidRows.length}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="max-h-[520px] overflow-auto">
                <table className="min-w-[820px] w-full text-left text-sm">
                  <caption className="sr-only">
                    CSV rate chart validation preview
                  </caption>

                  <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 shadow-sm">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 font-semibold"
                      >
                        Row
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 font-semibold"
                      >
                        Milk
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 font-semibold"
                      >
                        FAT
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 font-semibold"
                      >
                        SNF
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 font-semibold"
                      >
                        Rate / L
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 font-semibold"
                      >
                        Effective
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 font-semibold"
                      >
                        Validation
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr
                        key={row.rowNumber}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                          {row.rowNumber}
                        </td>

                        <td className="px-4 py-3 font-medium capitalize text-slate-900">
                          {row.milk_type || '—'}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {row.fat_percent || '—'}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {row.snf_percent || '—'}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {row.rate_per_litre || '—'}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {row.effective_from || '—'}
                        </td>

                        <td className="px-4 py-3">
                          {row.error ? (
                            <span className="inline-flex max-w-xs rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium leading-5 text-red-700">
                              {row.error}
                            </span>
                          ) : (
                            <span className="inline-flex rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-slate-500">
                Only valid rows will be sent to the
                secure server-side import.
              </p>

              <button
                type="button"
                onClick={handleImport}
                disabled={
                  validRows.length === 0 || importing
                }
                aria-busy={importing}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {importing ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    />
                    Importing…
                  </>
                ) : (
                  `Import ${validRows.length} Valid Row${
                    validRows.length === 1 ? '' : 's'
                  }`
                )}
              </button>
            </div>
          </>
        )}

        {importError && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
          >
            {importError}
          </div>
        )}

        {result && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm text-emerald-700"
              >
                ✓
              </span>

              <div>
                <p className="font-semibold text-emerald-900">
                  Import completed
                </p>

                <p className="mt-1 text-xs leading-5 text-emerald-700">
                  The rate chart import has finished.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-white/70 p-4">
                <p className="text-xs font-medium text-emerald-700">
                  Inserted
                </p>
                <p className="mt-1 text-lg font-bold text-emerald-900">
                  {result.inserted}
                </p>
              </div>

              <div className="rounded-xl bg-white/70 p-4">
                <p className="text-xs font-medium text-emerald-700">
                  Skipped
                </p>
                <p className="mt-1 text-lg font-bold text-emerald-900">
                  {result.skipped}
                </p>
              </div>

              <div className="rounded-xl bg-white/70 p-4">
                <p className="text-xs font-medium text-emerald-700">
                  Errors
                </p>
                <p className="mt-1 text-lg font-bold text-emerald-900">
                  {result.errors}
                </p>
              </div>
            </div>

            {result.details &&
              result.details.length > 0 && (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-white/60 p-4">
                  <p className="mb-3 text-xs font-semibold text-emerald-800">
                    Import messages
                  </p>

                  <div className="space-y-2">
                    {result.details
                      .slice(0, 20)
                      .map((detail, index) => (
                        <p
                          key={`${detail.row}-${index}`}
                          className="text-xs leading-5 text-emerald-800"
                        >
                          <span className="font-semibold">
                            Row {detail.row}:
                          </span>{' '}
                          {detail.message}
                        </p>
                      ))}

                    {result.details.length > 20 && (
                      <p className="pt-1 text-xs font-medium text-emerald-700">
                        Showing first 20 import messages.
                      </p>
                    )}
                  </div>
                </div>
              )}
          </div>
        )}

        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-xs leading-5 text-blue-800">
            <span className="font-semibold">
              Required columns:
            </span>{' '}
            milk_type, fat_percent, snf_percent,
            rate_per_litre, effective_from
          </p>
        </div>
      </div>
    </section>
  );
}