import { formatGHSWithSymbol } from './currency';

export interface ExportColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number);
  formatter?: (value: any) => string;
}

export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Create CSV header
  const headers = columns.map((col) => col.header).join(',');

  // Create CSV rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        let value: any;
        
        if (typeof col.accessor === 'function') {
          value = col.accessor(row);
        } else {
          value = row[col.accessor];
        }

        // Apply formatter if provided
        if (col.formatter) {
          value = col.formatter(value);
        }

        // Handle null/undefined
        if (value === null || value === undefined) {
          return '';
        }

        // Escape quotes and wrap in quotes if contains comma or newline
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
      })
      .join(',');
  });

  // Combine header and rows
  const csv = [headers, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Predefined export configurations
export const bookingExportColumns: ExportColumn<any>[] = [
  { header: 'Booking ID', accessor: 'id' },
  { header: 'Musician', accessor: 'musician_name' },
  { header: 'Hirer', accessor: 'hirer_name' },
  { header: 'Event Type', accessor: 'event_type' },
  { header: 'Event Date', accessor: (row) => new Date(row.event_date).toLocaleDateString() },
  { header: 'Location', accessor: 'location' },
  { header: 'Service Fee', accessor: 'service_fee', formatter: (val) => formatGHSWithSymbol(val) },
  { header: 'Status', accessor: 'status' },
  { header: 'Payment Status', accessor: 'payment_status' },
  { header: 'Hirer Confirmed', accessor: (row) => row.hirer_confirmed_at ? 'Yes' : 'No' },
  { header: 'Musician Confirmed', accessor: (row) => row.musician_confirmed_at ? 'Yes' : 'No' },
  { header: 'Payout Released', accessor: (row) => row.payout_released ? 'Yes' : 'No' },
  { header: 'Created At', accessor: (row) => new Date(row.created_at).toLocaleString() },
];

export const transactionExportColumns: ExportColumn<any>[] = [
  { header: 'Transaction ID', accessor: 'id' },
  { header: 'Type', accessor: 'type' },
  { header: 'Amount', accessor: 'amount', formatter: (val) => formatGHSWithSymbol(val) },
  { header: 'Status', accessor: 'status' },
  { header: 'User', accessor: (row) => row.user_name || row.user_id },
  { header: 'Booking ID', accessor: 'booking_id' },
  { header: 'Paystack Reference', accessor: 'paystack_reference' },
  { header: 'Description', accessor: 'description' },
  { header: 'Created At', accessor: (row) => new Date(row.created_at).toLocaleString() },
];

export const payoutExportColumns: ExportColumn<any>[] = [
  { header: 'Booking ID', accessor: 'id' },
  { header: 'Musician', accessor: 'musician_name' },
  { header: 'Event Type', accessor: 'event_type' },
  { header: 'Service Fee', accessor: 'service_fee', formatter: (val) => formatGHSWithSymbol(val) },
  { header: 'Payout Amount', accessor: (row) => formatGHSWithSymbol(row.musician_payout || (row.service_fee * 0.9)) },
  { header: 'Platform Fee', accessor: (row) => formatGHSWithSymbol(row.platform_fee || (row.service_fee * 0.1)) },
  { header: 'Released At', accessor: (row) => row.payout_released_at ? new Date(row.payout_released_at).toLocaleString() : 'Not Released' },
  { header: 'Event Date', accessor: (row) => new Date(row.event_date).toLocaleDateString() },
];

export const refundExportColumns: ExportColumn<any>[] = [
  { header: 'Refund ID', accessor: 'id' },
  { header: 'Booking ID', accessor: 'booking_id' },
  { header: 'Amount', accessor: 'amount', formatter: (val) => formatGHSWithSymbol(val) },
  { header: 'Percentage', accessor: (row) => `${row.refund_percentage}%` },
  { header: 'Status', accessor: 'status' },
  { header: 'Reason', accessor: 'reason' },
  { header: 'Requested At', accessor: (row) => new Date(row.requested_at).toLocaleString() },
  { header: 'Processed At', accessor: (row) => row.processed_at ? new Date(row.processed_at).toLocaleString() : 'Pending' },
  { header: 'Paystack Reference', accessor: 'paystack_reference' },
];

// Helper function to export with filters
export function exportFilteredData<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  filters?: Record<string, any>
): void {
  let filteredData = data;

  if (filters) {
    filteredData = data.filter((row: any) => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === null || value === undefined || value === '') return true;
        return row[key] === value;
      });
    });
  }

  exportToCSV(filteredData, columns, filename);
}
