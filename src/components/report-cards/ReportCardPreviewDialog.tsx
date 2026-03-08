import { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, X } from 'lucide-react';
import ReportCardPreview from './ReportCardPreview';

interface ReportCardPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportData: any;
  studentName: string;
}

const ReportCardPreviewDialog = ({ open, onOpenChange, reportData, studentName }: ReportCardPreviewDialogProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Report Card - ${studentName}</title>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
      <style>@media print { body { margin: 0; } }</style>
      </head><body>${printRef.current.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  const handleDownload = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Report Card - ${studentName}</title>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
      <style>@media print { body { margin: 0; } } @page { size: A4; margin: 10mm; }</style>
      </head><body>
      <p style="margin-bottom:10px;font-size:12px;color:#666;">Use Ctrl+P / Cmd+P and select "Save as PDF" to download.</p>
      ${printRef.current.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
  };

  if (!reportData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Report Card - {studentName}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div ref={printRef}>
          <ReportCardPreview data={reportData} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportCardPreviewDialog;
