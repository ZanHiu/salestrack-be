import { Request, Response, NextFunction } from 'express';
import * as reportService from '../services/report.service';
import { reportQuerySchema, exportQuerySchema } from '../schemas/report.schema';
import { buildReportWorkbook } from '../utils/excelExporter';

export async function byProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { year, categoryName } = reportQuerySchema.parse(req.query);
    const data = await reportService.byProduct(year, categoryName);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function byCustomer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { year } = reportQuerySchema.parse(req.query);
    const data = await reportService.byCustomer(year);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function exportExcel(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { year } = exportQuerySchema.parse(req.query);

    const [customerReport, productReport, rawExport] = await Promise.all([
      reportService.byCustomer(year),
      reportService.byProduct(year),
      reportService.getRawExportData(year),
    ]);

    const buffer = await buildReportWorkbook({
      year,
      customerReport,
      productReport,
      rawExport,
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="salestrack-${year}.xlsx"`,
    );
    res.status(200).send(buffer);
  } catch (err) {
    next(err);
  }
}
