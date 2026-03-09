import React, { forwardRef } from 'react';
import { format } from 'date-fns';

interface PaymentReceiptProps {
  payment: {
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    payment_reference: string;
    status: string;
    notes: string;
  };
  studentName: string;
  schoolName?: string;
}

const PaymentReceipt = forwardRef<HTMLDivElement, PaymentReceiptProps>(
  ({ payment, studentName, schoolName = 'School Name' }, ref) => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        minimumFractionDigits: 0,
      }).format(amount);
    };

    return (
      <div ref={ref} className="bg-white p-8 max-w-md mx-auto text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
          <h1 className="text-2xl font-bold uppercase tracking-wide">{schoolName}</h1>
          <p className="text-sm text-gray-600 mt-1">Official Payment Receipt</p>
        </div>

        {/* Receipt Number & Date */}
        <div className="flex justify-between text-sm mb-6">
          <div>
            <span className="font-semibold">Receipt No:</span>
            <span className="ml-2">{payment.payment_reference}</span>
          </div>
          <div>
            <span className="font-semibold">Date:</span>
            <span className="ml-2">{format(new Date(payment.payment_date), 'dd MMM yyyy')}</span>
          </div>
        </div>

        {/* Student Info */}
        <div className="bg-gray-100 p-3 rounded mb-6">
          <p className="text-sm">
            <span className="font-semibold">Received from:</span>
            <span className="ml-2">{studentName}</span>
          </p>
        </div>

        {/* Payment Details */}
        <div className="border border-gray-300 rounded overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="text-left p-3">Description</th>
                <th className="text-right p-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="p-3">Fee Payment</td>
                <td className="p-3 text-right">{formatCurrency(payment.amount)}</td>
              </tr>
            </tbody>
            <tfoot className="bg-gray-100 font-bold">
              <tr>
                <td className="p-3">Total Paid</td>
                <td className="p-3 text-right text-green-700">{formatCurrency(payment.amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment Method */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <span className="font-semibold">Payment Method:</span>
            <span className="ml-2 capitalize">{payment.payment_method}</span>
          </div>
          <div>
            <span className="font-semibold">Status:</span>
            <span className={`ml-2 capitalize ${payment.status === 'completed' ? 'text-green-700' : 'text-yellow-600'}`}>
              {payment.status}
            </span>
          </div>
        </div>

        {/* Notes */}
        {payment.notes && (
          <div className="text-sm mb-6 p-3 bg-gray-50 rounded border border-gray-200">
            <span className="font-semibold">Notes:</span>
            <p className="mt-1 text-gray-700">{payment.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-gray-300 pt-4 mt-6">
          <div className="flex justify-between items-end">
            <div className="text-xs text-gray-500">
              <p>This is a computer-generated receipt.</p>
              <p>Receipt ID: {payment.id.slice(0, 8)}</p>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-400 pt-1 w-32">
                <p className="text-xs text-gray-600">Authorized Signature</p>
              </div>
            </div>
          </div>
        </div>

        {/* Print timestamp */}
        <div className="text-center text-xs text-gray-400 mt-4">
          Printed on: {format(new Date(), 'dd MMM yyyy, HH:mm')}
        </div>
      </div>
    );
  }
);

PaymentReceipt.displayName = 'PaymentReceipt';

export default PaymentReceipt;
