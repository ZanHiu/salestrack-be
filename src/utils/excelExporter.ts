import ExcelJS from 'exceljs';
import type {
  ReportResult,
  ProductReportRow,
  CustomerReportRow,
  RawExportEntry,
  LeanProduct,
} from '../services/report.service';

const MONTH_LABELS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

// Brand colors aligned with FE palette
const COLOR = {
  HEADER_BG: 'FFE8DFD0', // brand-cream-warm
  TOTAL_BG: 'FFE8DFD0',
  TITLE_BG: 'FF1B4332', // forest green
  TITLE_TEXT: 'FFFAF8F3',
  GROUP_BG: 'FFF5F1E8',
  BORDER: 'FFD6D0C2',
  HEAT_LOW_BG: 'FFFEE2E2',
  HEAT_MID_BG: 'FFFEF3C7',
  HEAT_HIGH_BG: 'FFDCFCE7',
};

interface BuildArgs {
  year: number;
  customerReport: ReportResult<CustomerReportRow>;
  productReport: ReportResult<ProductReportRow>;
  rawExport: { rows: RawExportEntry[]; products: LeanProduct[] };
}

export async function buildReportWorkbook(args: BuildArgs): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SalesTrack';
  wb.created = new Date();

  buildKhachHangSheet(wb, args);
  buildByCustomerSheet(wb, args);
  buildByProductSheet(wb, args);
  buildDMSPSheet(wb, args);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ─────────────────────────────────────────────────────────────
// Sheet 1: KHACH HANG (raw entries — replicate original 20-col layout)
// Cols: A NHÂN VIÊN, B TÊN KH, C TT, D PHÂN LOẠI SP, E SẢN PHẨM,
//       F total, G-R T1-T12, S Grand Total, T TOTAL (customer yearly)
// ─────────────────────────────────────────────────────────────
function buildKhachHangSheet(wb: ExcelJS.Workbook, args: BuildArgs): void {
  const ws = wb.addWorksheet('KHACH HANG', {
    views: [{ state: 'frozen', xSplit: 5, ySplit: 4 }],
  });

  // Title
  ws.mergeCells('A1:T1');
  const title = ws.getCell('A1');
  title.value = `KẾ HOẠCH PHÂN BỔ DOANH SỐ ${args.year}`;
  title.font = { bold: true, size: 14, color: { argb: COLOR.TITLE_TEXT } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.TITLE_BG } };
  ws.getRow(1).height = 24;

  // Sub-title with span over months area
  ws.mergeCells('A2:E2');
  const subLeft = ws.getCell('A2');
  subLeft.value = 'DS THEO TỪNG THÁNG';
  subLeft.font = { italic: true, size: 10, color: { argb: 'FF666666' } };
  subLeft.alignment = { horizontal: 'left', indent: 1 };

  ws.mergeCells('F2:R2');
  const subRight = ws.getCell('F2');
  subRight.value = 'DOANH SỐ THỰC HIỆN THEO TỪNG THÁNG · ĐVT: TRIỆU ĐỒNG';
  subRight.font = { italic: true, size: 10, color: { argb: 'FF666666' } };
  subRight.alignment = { horizontal: 'center' };

  // Header row 4 (20 columns)
  const headers = [
    'NHÂN VIÊN',
    'TÊN KH',
    'TT',
    'PHÂN LOẠI SP',
    'SẢN PHẨM',
    'total',
    ...MONTH_LABELS,
    'Grand Total',
    'TOTAL',
  ];
  const headerRow = ws.getRow(4);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    styleHeader(cell);
  });
  headerRow.height = 22;

  // Data — group by customer, emit per-customer subtotal at end of each group
  let rowIdx = 5;
  let tt = 1;
  let currentCustomer = '';
  let customerStartRow = 5;
  let customerSum = 0;
  let customerMonthSums = Array(12).fill(0);

  function emitCustomerSubtotal(name: string) {
    if (!name) return;
    const r = ws.getRow(rowIdx);
    r.getCell(2).value = name;
    r.getCell(5).value = `TOTAL ${name}`;
    r.getCell(6).value = Math.round(customerSum * 100) / 100;
    customerMonthSums.forEach((v, mi) => {
      const cell = r.getCell(7 + mi);
      cell.value = v > 0 ? Math.round(v * 100) / 100 : 0;
      cell.numFmt = '#,##0.##';
      cell.alignment = { horizontal: 'right' };
    });
    r.getCell(19).value = Math.round(customerSum * 100) / 100;
    r.getCell(20).value = Math.round(customerSum * 100) / 100;
    r.getCell(6).numFmt = '#,##0.##';
    r.getCell(19).numFmt = '#,##0.##';
    r.getCell(20).numFmt = '#,##0.##';
    styleSubtotalRow(r, 20);
    rowIdx += 1;
  }

  for (const row of args.rawExport.rows) {
    const isFirstOfCustomer = row.customer !== currentCustomer;

    if (isFirstOfCustomer && currentCustomer) {
      emitCustomerSubtotal(currentCustomer);
      tt = 1;
      customerSum = 0;
      customerMonthSums = Array(12).fill(0);
    }

    if (isFirstOfCustomer) {
      currentCustomer = row.customer;
      customerStartRow = rowIdx;
    }

    const r = ws.getRow(rowIdx);
    r.getCell(1).value = ''; // NHÂN VIÊN — không có data
    r.getCell(2).value = isFirstOfCustomer ? row.customer : '';
    r.getCell(3).value = tt++;
    r.getCell(4).value = row.categoryName;
    r.getCell(5).value = row.productName;
    r.getCell(6).value = row.total > 0 ? Math.round(row.total * 100) / 100 : 0;
    r.getCell(6).numFmt = '#,##0.##';
    r.getCell(6).alignment = { horizontal: 'right' };

    for (let m = 0; m < 12; m += 1) {
      const v = row.months[m];
      const cell = r.getCell(7 + m);
      cell.value = v > 0 ? Math.round(v * 100) / 100 : null;
      cell.numFmt = '#,##0.##';
      cell.alignment = { horizontal: 'right' };
      customerMonthSums[m] += v;
    }

    const grandTotalCell = r.getCell(19);
    grandTotalCell.value = Math.round(row.total * 100) / 100;
    grandTotalCell.numFmt = '#,##0.##';
    grandTotalCell.alignment = { horizontal: 'right' };
    grandTotalCell.font = { bold: true };

    // TOTAL (col T) — customer yearly total, only on first row of customer block
    if (isFirstOfCustomer) {
      // Compute customer yearly total later when we know all rows
      // For now, leave empty; will fill in second pass
      r.getCell(20).value = null;
    }

    customerSum += row.total;
    applyBorders(r, 20);
    rowIdx += 1;
  }

  // Last customer subtotal
  if (currentCustomer) emitCustomerSubtotal(currentCustomer);

  // Second pass: fill customer-year-total on first row of each customer
  // (simpler: aggregate from rawExport.rows)
  const customerYearTotals = new Map<string, number>();
  for (const row of args.rawExport.rows) {
    customerYearTotals.set(
      row.customer,
      (customerYearTotals.get(row.customer) ?? 0) + row.total,
    );
  }
  let seenCustomers = new Set<string>();
  for (let r = 5; r < rowIdx; r += 1) {
    const cust = ws.getRow(r).getCell(2).value;
    if (cust && typeof cust === 'string' && !seenCustomers.has(cust)
        && !String(ws.getRow(r).getCell(5).value ?? '').startsWith('TOTAL ')) {
      seenCustomers.add(cust);
      const total = customerYearTotals.get(cust) ?? 0;
      const cell = ws.getRow(r).getCell(20);
      cell.value = Math.round(total * 100) / 100;
      cell.numFmt = '#,##0.##';
      cell.alignment = { horizontal: 'right' };
      cell.font = { bold: true };
    }
  }

  // Column widths
  ws.getColumn(1).width = 16; // NHÂN VIÊN
  ws.getColumn(2).width = 18; // TÊN KH
  ws.getColumn(3).width = 5;  // TT
  ws.getColumn(4).width = 17; // PHÂN LOẠI
  ws.getColumn(5).width = 22; // SẢN PHẨM
  ws.getColumn(6).width = 9;  // total
  for (let i = 7; i <= 18; i += 1) ws.getColumn(i).width = 8;
  ws.getColumn(19).width = 11; // Grand Total
  ws.getColumn(20).width = 11; // TOTAL
}

function styleSubtotalRow(row: ExcelJS.Row, colCount: number): void {
  for (let i = 1; i <= colCount; i += 1) {
    const cell = row.getCell(i);
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.GROUP_BG } };
    cell.border = {
      top: { style: 'thin', color: { argb: COLOR.BORDER } },
      left: { style: 'thin', color: { argb: COLOR.BORDER } },
      bottom: { style: 'medium', color: { argb: COLOR.BORDER } },
      right: { style: 'thin', color: { argb: COLOR.BORDER } },
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Sheet 2: THEO KHÁCH HÀNG (pivot KH × T1-T12)
// ─────────────────────────────────────────────────────────────
function buildByCustomerSheet(wb: ExcelJS.Workbook, args: BuildArgs): void {
  const ws = wb.addWorksheet('THEO KHÁCH HÀNG', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 4 }],
  });

  // Title
  ws.mergeCells('A1:P1');
  const title = ws.getCell('A1');
  title.value = `TỔNG HỢP THEO KHÁCH HÀNG ${args.year}`;
  title.font = { bold: true, size: 14, color: { argb: COLOR.TITLE_TEXT } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.TITLE_BG } };
  ws.getRow(1).height = 24;

  ws.mergeCells('A2:P2');
  const sub = ws.getCell('A2');
  sub.value = 'ĐVT: TRIỆU ĐỒNG';
  sub.font = { italic: true, size: 10, color: { argb: 'FF666666' } };
  sub.alignment = { horizontal: 'center' };

  // Header row 4
  const headers = ['TT', 'KHÁCH HÀNG', ...MONTH_LABELS, 'CẢ NĂM', '% HT'];
  const headerRow = ws.getRow(4);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    styleHeader(cell);
  });
  headerRow.height = 22;

  // Data
  let rowIdx = 5;
  args.customerReport.rows.forEach((row, i) => {
    const r = ws.getRow(rowIdx);
    r.getCell(1).value = i + 1;
    r.getCell(2).value = row.customer.name;
    row.months.forEach((m, mi) => {
      const cell = r.getCell(3 + mi);
      cell.value = m.actual > 0 ? Math.round(m.actual * 100) / 100 : null;
      cell.numFmt = '#,##0.##';
      cell.alignment = { horizontal: 'right' };
    });
    const totalCell = r.getCell(15);
    totalCell.value = Math.round(row.yearTotal.actual * 100) / 100;
    totalCell.numFmt = '#,##0.##';
    totalCell.alignment = { horizontal: 'right' };
    totalCell.font = { bold: true };
    const pctCell = r.getCell(16);
    pctCell.value =
      row.yearTotal.completionPercent === null
        ? null
        : row.yearTotal.completionPercent / 100;
    pctCell.numFmt = '0%';
    pctCell.alignment = { horizontal: 'right' };
    applyBorders(r, 16);
    rowIdx += 1;
  });

  // TỔNG row
  const totalRow = ws.getRow(rowIdx);
  totalRow.getCell(1).value = '';
  totalRow.getCell(2).value = 'TỔNG';
  for (let m = 0; m < 12; m += 1) {
    const sum = args.customerReport.rows.reduce((s, r) => s + r.months[m].actual, 0);
    const cell = totalRow.getCell(3 + m);
    cell.value = sum > 0 ? Math.round(sum * 100) / 100 : null;
    cell.numFmt = '#,##0.##';
    cell.alignment = { horizontal: 'right' };
  }
  totalRow.getCell(15).value = Math.round(args.customerReport.grandTotal.actual * 100) / 100;
  totalRow.getCell(15).numFmt = '#,##0.##';
  totalRow.getCell(15).alignment = { horizontal: 'right' };
  totalRow.getCell(16).value =
    args.customerReport.grandTotal.completionPercent === null
      ? null
      : args.customerReport.grandTotal.completionPercent / 100;
  totalRow.getCell(16).numFmt = '0%';
  styleTotalRow(totalRow, 16);

  // Column widths
  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 24;
  for (let i = 3; i <= 14; i += 1) ws.getColumn(i).width = 9;
  ws.getColumn(15).width = 11;
  ws.getColumn(16).width = 7;
}

// ─────────────────────────────────────────────────────────────
// Sheet 3: THEO SẢN PHẨM (pivot SP, grouped by category)
// ─────────────────────────────────────────────────────────────
function buildByProductSheet(wb: ExcelJS.Workbook, args: BuildArgs): void {
  const ws = wb.addWorksheet('THEO SẢN PHẨM', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 4 }],
  });

  ws.mergeCells('A1:Q1');
  const title = ws.getCell('A1');
  title.value = `TỔNG HỢP THEO SẢN PHẨM ${args.year}`;
  title.font = { bold: true, size: 14, color: { argb: COLOR.TITLE_TEXT } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.TITLE_BG } };
  ws.getRow(1).height = 24;

  ws.mergeCells('A2:Q2');
  const sub = ws.getCell('A2');
  sub.value = 'ĐVT: TRIỆU ĐỒNG';
  sub.font = { italic: true, size: 10, color: { argb: 'FF666666' } };
  sub.alignment = { horizontal: 'center' };

  const headers = ['TT', 'NHÓM', 'SẢN PHẨM', ...MONTH_LABELS, 'CẢ NĂM', '% HT'];
  const headerRow = ws.getRow(4);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    styleHeader(cell);
  });
  headerRow.height = 22;

  let rowIdx = 5;
  let tt = 1;
  let currentCategory = '';
  for (const row of args.productReport.rows) {
    const r = ws.getRow(rowIdx);
    const isFirstOfCategory = row.product.categoryName !== currentCategory;
    currentCategory = row.product.categoryName;

    r.getCell(1).value = tt++;
    r.getCell(2).value = isFirstOfCategory ? row.product.categoryName : '';
    r.getCell(3).value = row.product.name;
    row.months.forEach((m, mi) => {
      const cell = r.getCell(4 + mi);
      cell.value = m.actual > 0 ? Math.round(m.actual * 100) / 100 : null;
      cell.numFmt = '#,##0.##';
      cell.alignment = { horizontal: 'right' };
    });
    const totalCell = r.getCell(16);
    totalCell.value = Math.round(row.yearTotal.actual * 100) / 100;
    totalCell.numFmt = '#,##0.##';
    totalCell.alignment = { horizontal: 'right' };
    totalCell.font = { bold: true };
    const pctCell = r.getCell(17);
    pctCell.value =
      row.yearTotal.completionPercent === null
        ? null
        : row.yearTotal.completionPercent / 100;
    pctCell.numFmt = '0%';
    pctCell.alignment = { horizontal: 'right' };
    applyBorders(r, 17);
    rowIdx += 1;
  }

  // TỔNG row
  const totalRow = ws.getRow(rowIdx);
  totalRow.getCell(2).value = '';
  totalRow.getCell(3).value = 'TỔNG';
  for (let m = 0; m < 12; m += 1) {
    const sum = args.productReport.rows.reduce((s, r) => s + r.months[m].actual, 0);
    const cell = totalRow.getCell(4 + m);
    cell.value = sum > 0 ? Math.round(sum * 100) / 100 : null;
    cell.numFmt = '#,##0.##';
    cell.alignment = { horizontal: 'right' };
  }
  totalRow.getCell(16).value = Math.round(args.productReport.grandTotal.actual * 100) / 100;
  totalRow.getCell(16).numFmt = '#,##0.##';
  totalRow.getCell(16).alignment = { horizontal: 'right' };
  totalRow.getCell(17).value =
    args.productReport.grandTotal.completionPercent === null
      ? null
      : args.productReport.grandTotal.completionPercent / 100;
  totalRow.getCell(17).numFmt = '0%';
  styleTotalRow(totalRow, 17);

  // Column widths
  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 22;
  for (let i = 4; i <= 15; i += 1) ws.getColumn(i).width = 9;
  ws.getColumn(16).width = 11;
  ws.getColumn(17).width = 7;
}

// ─────────────────────────────────────────────────────────────
// Sheet 4: DMSP (danh muc san pham)
// ─────────────────────────────────────────────────────────────
function buildDMSPSheet(wb: ExcelJS.Workbook, args: BuildArgs): void {
  const ws = wb.addWorksheet('DMSP', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }],
  });

  ws.mergeCells('A1:E1');
  const title = ws.getCell('A1');
  title.value = 'DANH MỤC SẢN PHẨM';
  title.font = { bold: true, size: 14, color: { argb: COLOR.TITLE_TEXT } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.TITLE_BG } };
  ws.getRow(1).height = 24;

  const headers = ['TT', 'TÊN SẢN PHẨM', 'NHÓM', 'ĐƠN VỊ', 'TRẠNG THÁI'];
  const headerRow = ws.getRow(3);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    styleHeader(cell);
  });
  headerRow.height = 22;

  args.rawExport.products.forEach((p, i) => {
    const r = ws.getRow(4 + i);
    r.getCell(1).value = i + 1;
    r.getCell(2).value = p.name;
    r.getCell(3).value = p.categoryName;
    r.getCell(4).value = p.unit ?? '';
    r.getCell(5).value = p.isActive ? 'Đang bán' : 'Ngừng KD';
    applyBorders(r, 5);
  });

  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 28;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 10;
  ws.getColumn(5).width = 13;
}

// ─────────────────────────────────────────────────────────────
// Style helpers
// ─────────────────────────────────────────────────────────────
function styleHeader(cell: ExcelJS.Cell): void {
  cell.font = { bold: true, size: 11 };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.HEADER_BG } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: COLOR.BORDER } },
    left: { style: 'thin', color: { argb: COLOR.BORDER } },
    bottom: { style: 'medium', color: { argb: COLOR.BORDER } },
    right: { style: 'thin', color: { argb: COLOR.BORDER } },
  };
}

function styleTotalRow(row: ExcelJS.Row, colCount: number): void {
  for (let i = 1; i <= colCount; i += 1) {
    const cell = row.getCell(i);
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.TOTAL_BG } };
    cell.border = {
      top: { style: 'medium', color: { argb: COLOR.BORDER } },
      left: { style: 'thin', color: { argb: COLOR.BORDER } },
      bottom: { style: 'thin', color: { argb: COLOR.BORDER } },
      right: { style: 'thin', color: { argb: COLOR.BORDER } },
    };
  }
}

function applyBorders(row: ExcelJS.Row, colCount: number): void {
  for (let i = 1; i <= colCount; i += 1) {
    const cell = row.getCell(i);
    cell.border = {
      top: { style: 'thin', color: { argb: COLOR.BORDER } },
      left: { style: 'thin', color: { argb: COLOR.BORDER } },
      bottom: { style: 'thin', color: { argb: COLOR.BORDER } },
      right: { style: 'thin', color: { argb: COLOR.BORDER } },
    };
  }
}
