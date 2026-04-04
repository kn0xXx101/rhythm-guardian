import html2canvas from 'html2canvas';

/**
 * Export a chart element as an image
 * @param elementId - The ID of the chart container element
 * @param filename - The filename for the downloaded image (without extension)
 */
export async function exportChartAsImage(elementId: string, filename: string = 'chart') {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
    });

    // Create download link
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Error exporting chart:', error);
    throw error;
  }
}

/**
 * Format tooltip value with currency symbol
 */
export function formatTooltipValue(
  value: number,
  format: 'currency' | 'number' | 'percent' = 'number'
): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency: 'GHS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    default:
      return value.toLocaleString();
  }
}

/**
 * Create a custom tooltip formatter function for Recharts
 */
export function createCurrencyFormatter() {
  return (value: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };
}
