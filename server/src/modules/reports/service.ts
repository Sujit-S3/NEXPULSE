import { NotFoundError } from '../../errors/index.js';
import { logger } from '../../logger/index.js';
import { analyticsService } from '../analytics/service.js';
import { createWorkspaceNotification } from '../notifications/service.js';
import type { IReport } from './model.js';
import { reportRepository } from './repository.js';

function publicReport(report: IReport) {
  return {
    id: report._id.toString(),
    connectionId: report.connectionId.toString(),
    title: report.title,
    provider: report.provider,
    providerAccountId: report.providerAccountId,
    range: { from: report.rangeFrom.toISOString(), to: report.rangeTo.toISOString() },
    collectedAt: report.collectedAt.toISOString(),
    metrics: report.metrics,
    unavailable: report.unavailable,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
  };
}

function csv(report: IReport): Buffer {
  const rows = [
    ['metric', 'value'],
    ...Object.entries(report.metrics).map(([key, value]) => [key, value ?? 'unavailable']),
  ];
  const content = rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  return Buffer.from(content, 'utf8');
}

function pdfEscape(value: string): string {
  return value
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function pdf(report: IReport): Buffer {
  const lines = [
    report.title,
    `Provider: ${report.provider}`,
    `Account: ${report.providerAccountId}`,
    `Range: ${report.rangeFrom.toISOString()} - ${report.rangeTo.toISOString()}`,
    ...Object.entries(report.metrics).map(
      ([key, value]) => `${key}: ${value ?? 'unavailable'}`,
    ),
  ];
  const commands = lines
    .map((line, index) => `BT /F1 ${index === 0 ? 18 : 11} Tf 56 ${760 - index * 24} Td (${pdfEscape(line)}) Tj ET`)
    .join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(commands, 'ascii')} >>\nstream\n${commands}\nendstream`,
  ];
  let output = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output, 'ascii'));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(output, 'ascii');
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    output += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(output, 'ascii');
}

export const reportService = {
  async create(
    workspaceId: string,
    userId: string,
    input: { connectionId: string; title: string; from: Date; to: Date },
  ) {
    const analytics = await analyticsService.get(workspaceId, {
      connectionId: input.connectionId,
      from: input.from,
      to: input.to,
      limit: 25,
      forceRefresh: false,
    });
    const report = await reportRepository.create({
      workspaceId,
      connectionId: input.connectionId,
      createdBy: userId,
      title: input.title,
      provider: analytics.provider,
      providerAccountId: analytics.providerAccountId,
      rangeFrom: new Date(analytics.range.from),
      rangeTo: new Date(analytics.range.to),
      collectedAt: new Date(analytics.collectedAt),
      metrics: analytics.metrics,
      unavailable: analytics.unavailable,
    });
    await createWorkspaceNotification(workspaceId, {
      type: 'report',
      title: 'Report ready',
      message: `${report.title} is ready to export.`,
      actionable: true,
      actionLabel: 'View report',
      actionPath: '/reports',
      resourceType: 'report',
      resourceId: report._id.toString(),
    }).catch((error: unknown) => {
      logger.warn('Unable to create report notification', {
        workspaceId,
        reportId: report._id.toString(),
        code: error instanceof Error ? error.name : 'UNKNOWN',
      });
    });
    return publicReport(report);
  },

  async list(workspaceId: string, connectionId: string, page: number, limit: number) {
    const result = await reportRepository.list(workspaceId, connectionId, page, limit);
    return {
      items: result.items.map(publicReport),
      meta: {
        page,
        limit,
        total: result.total,
        hasNext: page * limit < result.total,
        hasPrevious: page > 1,
      },
    };
  },

  async export(workspaceId: string, reportId: string, format: 'csv' | 'pdf') {
    const report = await reportRepository.findById(workspaceId, reportId);
    if (!report) throw new NotFoundError('Report not found');
    return {
      body: format === 'csv' ? csv(report) : pdf(report),
      contentType: format === 'csv' ? 'text/csv; charset=utf-8' : 'application/pdf',
      filename: `${report.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'report'}.${format}`,
    };
  },
};
