import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportKpi {
  label: string;
  value: string;
}

export interface ReportExportSpec {
  /** File base name, without extension. */
  fileName: string;
  /** Document title, e.g. "Revenue Analytics". */
  title: string;
  /** Human-readable description of the filters currently applied, e.g. "Hotel: All | 2026-01-01 to 2026-03-31". */
  filterSummary: string;
  /** Optional KPI summary shown above the table. */
  kpis?: ReportKpi[];
  /** Table column headers. */
  headers: string[];
  /** Table rows, already formatted as display strings, in the same order as headers. */
  rows: string[][];
}

/**
 * Generates downloadable report files (CSV, PDF) directly from the data an admin report page
 * already has in memory — the same data returned by the existing GET report APIs and already
 * narrowed by whatever filters are currently applied. No new backend endpoints; this only
 * formats data the page already fetched.
 */
@Injectable({ providedIn: 'root' })
export class ReportExportService {

  private static readonly BRAND_NAME = 'Elegant Enclave';
  private static readonly FOOTER_NOTE = 'Elegant Enclave · Admin Reports · Confidential';

  private generatedOnLabel(): string {
    return `Generated: ${new Date().toLocaleString('en-IN')} IST`;
  }

  exportCsv(spec: ReportExportSpec): void {
    const lines: string[] = [];
    lines.push(this.csvEscapeRow([ReportExportService.BRAND_NAME]));
    lines.push(this.csvEscapeRow([spec.title]));
    lines.push(this.csvEscapeRow([`Filters: ${spec.filterSummary}`]));
    lines.push(this.csvEscapeRow([this.generatedOnLabel()]));
    lines.push('');

    if (spec.kpis?.length) {
      lines.push(this.csvEscapeRow(spec.kpis.map(k => k.label)));
      lines.push(this.csvEscapeRow(spec.kpis.map(k => k.value)));
      lines.push('');
    }

    lines.push(this.csvEscapeRow(spec.headers));
    for (const row of spec.rows) {
      lines.push(this.csvEscapeRow(row));
    }

    lines.push('');
    lines.push(this.csvEscapeRow([ReportExportService.FOOTER_NOTE]));

    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, `${spec.fileName}.csv`);
  }

  exportPdf(spec: ReportExportSpec): void {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const brandPurple: [number, number, number] = [26, 10, 46];
    const brandGold: [number, number, number] = [212, 175, 55];
    const headerHeight = 34;
    const footerY = pageHeight - 14;

    // Repeats on every page — drawn once for page 1 up front, then again from didDrawPage for
    // every page a multi-page table spills onto, so a printed/scrolled report never loses context
    // of which report this is partway through.
    const drawHeader = () => {
      doc.setFillColor(...brandPurple);
      doc.rect(0, 0, pageWidth, headerHeight, 'F');

      doc.setTextColor(...brandGold);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(ReportExportService.BRAND_NAME, 14, 14);

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Admin Reports', 14, 20);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(spec.title, pageWidth - 14, 14, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(230, 220, 245);
      doc.text(`Filters: ${spec.filterSummary}`, pageWidth - 14, 20, { align: 'right' });
      doc.text(this.generatedOnLabel(), pageWidth - 14, 25, { align: 'right' });
    };

    // Left/right footer text (page X of Y is filled in afterwards, once the total is known).
    const drawFooter = () => {
      doc.setDrawColor(200, 200, 200);
      doc.line(14, footerY - 6, pageWidth - 14, footerY - 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(ReportExportService.FOOTER_NOTE, 14, footerY);
    };

    drawHeader();
    drawFooter();

    let cursorY = headerHeight + 8;

    if (spec.kpis?.length) {
      autoTable(doc, {
        startY: cursorY,
        head: [spec.kpis.map(k => k.label)],
        body: [spec.kpis.map(k => k.value)],
        theme: 'plain',
        styles: { fontSize: 9, halign: 'center' },
        headStyles: { fillColor: brandPurple, textColor: 255 },
        margin: { left: 14, right: 14, top: headerHeight + 6, bottom: 22 },
        didDrawPage: () => { drawHeader(); drawFooter(); }
      });
      cursorY = (doc as any).lastAutoTable.finalY + 8;
    }

    autoTable(doc, {
      startY: cursorY,
      head: [spec.headers],
      body: spec.rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: brandPurple, textColor: 255 },
      margin: { left: 14, right: 14, top: headerHeight + 6, bottom: 22 },
      didDrawPage: () => { drawHeader(); drawFooter(); }
    });

    // "Page X of Y" — the total page count only exists once every page has actually been drawn,
    // so this has to be a final pass over every page rather than something drawFooter can do live.
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, footerY, { align: 'right' });
    }

    doc.save(`${spec.fileName}.pdf`);
  }

  private csvEscapeRow(cells: string[]): string {
    return cells.map(c => {
      const value = c ?? '';
      return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    }).join(',');
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
