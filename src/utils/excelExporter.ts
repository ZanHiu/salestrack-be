import * as XLSX from 'xlsx';
import type {
  ReportResult,
  ProductReportRow,
  CustomerReportRow,
} from '../services/report.service';

const MONTH_LABELS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

function buildRows(
  report: ReportResult<ProductReportRow | CustomerReportRow>,
  type: 'by-product' | 'by-customer',
): (string | number)[][] {
  const header = [
    type === 'by-product' ? 'San pham' : 'Khach hang',
    type === 'by-product' ? 'Nhom SP' : '',
    ...MONTH_LABELS,
    'Tong KH',
    'Tong TH',
    '% HT',
  ];

  const rows: (string | number)[][] = [header];

  for (const r of report.rows) {
    const label =
      'product' in r ? r.product.name : (r as CustomerReportRow).customer.name;
    const group = 'product' in r ? r.product.categoryName : '';

    const monthActuals = r.months.map((m) => m.actual);
    rows.push([
      label,
      group,
      ...monthActuals,
      r.yearTotal.plan,
      r.yearTotal.actual,
      r.yearTotal.completionPercent ?? '',
    ]);
  }

  rows.push([
    'TONG',
    '',
    ...MONTH_LABELS.map((_, i) =>
      report.rows.reduce((sum, r) => sum + r.months[i].actual, 0),
    ),
    report.grandTotal.plan,
    report.grandTotal.actual,
    report.grandTotal.completionPercent ?? '',
  ]);

  return rows;
}

export function buildReportWorkbook(
  report: ReportResult<ProductReportRow | CustomerReportRow>,
  type: 'by-product' | 'by-customer',
): Buffer {
  const rows = buildRows(report, type);
  const ws = XLSX.utils.aoa_to_sheet(rows);

  const colWidths = [
    { wch: 30 },
    { wch: 18 },
    ...MONTH_LABELS.map(() => ({ wch: 8 })),
    { wch: 10 },
    { wch: 10 },
    { wch: 8 },
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  const sheetName = type === 'by-product' ? 'Theo san pham' : 'Theo khach hang';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
