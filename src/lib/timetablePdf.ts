import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface TimetablePdfEntry {
  day: string;
  startTime: string;
  endTime: string;
  /** Lines shown inside the cell, e.g. ["Mathematics", "P4", "Mr. Okello", "Room 3"] */
  lines: string[];
}

export interface TimetablePdfOptions {
  title: string;
  subtitle?: string;
  days: string[];
  entries: TimetablePdfEntry[];
  fileName?: string;
}

const formatTime = (time: string) => (time ? time.slice(0, 5) : '');

export function exportTimetablePdf({
  title,
  subtitle,
  days,
  entries,
  fileName,
}: TimetablePdfOptions) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  doc.setFontSize(16);
  doc.text(title, 40, 40);

  doc.setFontSize(10);
  let y = 58;
  if (subtitle) {
    doc.text(subtitle, 40, y);
    y += 14;
  }
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, y);

  const slots = Array.from(
    new Set(entries.map((e) => `${e.startTime}-${e.endTime}`))
  ).sort();

  const body = slots.map((slot) => {
    const [start, end] = slot.split('-');
    const row: string[] = [`${formatTime(start)} - ${formatTime(end)}`];
    days.forEach((day) => {
      const match = entries.find(
        (e) => e.day === day && e.startTime === start && e.endTime === end
      );
      row.push(match ? match.lines.filter(Boolean).join('\n') : '-');
    });
    return row;
  });

  autoTable(doc, {
    startY: y + 14,
    head: [['Time', ...days]],
    body: body.length ? body : [['No schedule entries', ...days.map(() => '-')]],
    styles: { fontSize: 8, cellPadding: 4, valign: 'middle' },
    headStyles: { fillColor: [30, 64, 124], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 80, fontStyle: 'bold' } },
    theme: 'grid',
  });

  doc.save(fileName || `${title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
