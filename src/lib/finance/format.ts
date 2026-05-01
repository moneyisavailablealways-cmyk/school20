export const formatUGX = (amount: number | string | null | undefined) => {
  const n = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  if (isNaN(n as number)) return 'UGX 0';
  return 'UGX ' + (n as number).toLocaleString('en-UG', { maximumFractionDigits: 0 });
};

export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
