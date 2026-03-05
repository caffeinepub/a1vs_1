// Type stubs for CDN-loaded libraries (xlsx, jspdf, jspdf-autotable).
// These are loaded via <script> tags in index.html and exposed as globals.
// We expose them as typed window properties so the rest of the app can
// access them without ESM imports (which would cause Rollup to fail).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const XLSX: any;

interface Window {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  XLSX: any;
  jspdf: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jsPDF: any;
  };
}
