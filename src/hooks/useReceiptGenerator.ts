import { useCallback } from 'react';
import { format } from 'date-fns';

interface PaymentData {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_reference: string;
  status: string;
  notes: string;
}

export const useReceiptGenerator = () => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const generateReceiptHTML = useCallback((payment: PaymentData, studentName: string, schoolName: string = 'School') => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt - ${payment.payment_reference}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
          .receipt { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border: 1px solid #ddd; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 15px; }
          .header h1 { font-size: 20px; text-transform: uppercase; letter-spacing: 1px; }
          .header p { font-size: 12px; color: #666; margin-top: 5px; }
          .meta { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 20px; }
          .student-info { background: #f0f0f0; padding: 10px; border-radius: 4px; margin-bottom: 20px; font-size: 13px; }
          .student-info span { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
          th { background: #333; color: white; padding: 10px; text-align: left; }
          th:last-child { text-align: right; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          td:last-child { text-align: right; }
          tfoot td { background: #f0f0f0; font-weight: bold; }
          tfoot td:last-child { color: #228B22; }
          .details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; margin-bottom: 20px; }
          .details span { font-weight: bold; }
          .notes { background: #fafafa; padding: 10px; border: 1px solid #eee; border-radius: 4px; font-size: 12px; margin-bottom: 20px; }
          .notes span { font-weight: bold; }
          .footer { border-top: 2px solid #ddd; padding-top: 15px; display: flex; justify-content: space-between; align-items: flex-end; }
          .footer-left { font-size: 10px; color: #888; }
          .signature { text-align: center; }
          .signature-line { border-top: 1px solid #666; width: 120px; padding-top: 5px; font-size: 10px; color: #666; }
          .print-date { text-align: center; font-size: 10px; color: #aaa; margin-top: 15px; }
          .completed { color: #228B22; }
          .pending { color: #DAA520; }
          @media print {
            body { background: white; padding: 0; }
            .receipt { border: none; max-width: 100%; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>${schoolName}</h1>
            <p>Official Payment Receipt</p>
          </div>
          
          <div class="meta">
            <div><span style="font-weight:bold">Receipt No:</span> ${payment.payment_reference}</div>
            <div><span style="font-weight:bold">Date:</span> ${format(new Date(payment.payment_date), 'dd MMM yyyy')}</div>
          </div>
          
          <div class="student-info">
            <span>Received from:</span> ${studentName}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Fee Payment</td>
                <td>${formatCurrency(payment.amount)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>Total Paid</td>
                <td>${formatCurrency(payment.amount)}</td>
              </tr>
            </tfoot>
          </table>
          
          <div class="details">
            <div><span>Payment Method:</span> ${payment.payment_method}</div>
            <div><span>Status:</span> <span class="${payment.status === 'completed' ? 'completed' : 'pending'}">${payment.status}</span></div>
          </div>
          
          ${payment.notes ? `
            <div class="notes">
              <span>Notes:</span>
              <p style="margin-top:5px">${payment.notes}</p>
            </div>
          ` : ''}
          
          <div class="footer">
            <div class="footer-left">
              <p>This is a computer-generated receipt.</p>
              <p>Receipt ID: ${payment.id.slice(0, 8)}</p>
            </div>
            <div class="signature">
              <div class="signature-line">Authorized Signature</div>
            </div>
          </div>
          
          <div class="print-date">
            Printed on: ${format(new Date(), 'dd MMM yyyy, HH:mm')}
          </div>
        </div>
        
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
  }, []);

  const printReceipt = useCallback((payment: PaymentData, studentName: string, schoolName?: string) => {
    const receiptHTML = generateReceiptHTML(payment, studentName, schoolName);
    const printWindow = window.open('', '_blank', 'width=500,height=700');
    
    if (printWindow) {
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
    }
  }, [generateReceiptHTML]);

  return { printReceipt, generateReceiptHTML };
};
