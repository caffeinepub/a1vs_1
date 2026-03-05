// Thin shim that exposes the CDN-loaded jsPDF global as ES module exports.
// jsPDF and jspdf-autotable are loaded via <script> in index.html.
// jsPDF is available as window.jspdf.jsPDF
// autoTable patches jsPDF instances and is accessible as instance.autoTable

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getjsPDF = (): any =>
  (window as any).jspdf?.jsPDF ?? (window as any).jsPDF;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function newPDF(): any {
  const Ctor = getjsPDF();
  return new Ctor();
}

// autoTable is patched onto jsPDF instances by the autotable script.
// We call it via the patched method on the doc instance.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function autoTable(doc: any, options: Record<string, unknown>): void {
  // jspdf-autotable CDN version adds autoTable to jsPDF prototype
  if (typeof doc.autoTable === "function") {
    doc.autoTable(options);
  } else {
    // fallback: try window.jspdfAutoTable
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = (window as any).jspdfAutoTable as AnyFn | undefined;
    if (fn) fn(doc, options);
  }
}
