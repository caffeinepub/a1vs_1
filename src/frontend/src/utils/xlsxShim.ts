// Thin shim that exposes the CDN-loaded XLSX global as an ES module default export.
// XLSX is loaded via <script> in index.html as window.XLSX.
// Using a getter so we always access the most current global value.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getXLSX(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).XLSX;
}

const XLSX = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  read: (data: ArrayBuffer, opts: { type: string }): any =>
    getXLSX().read(data, opts),
  utils: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheet_to_json: (sheet: unknown): any[] =>
      getXLSX().utils.sheet_to_json(sheet),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    aoa_to_sheet: (data: unknown[][]): unknown =>
      getXLSX().utils.aoa_to_sheet(data),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    json_to_sheet: (data: unknown[]): any =>
      getXLSX().utils.json_to_sheet(data),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    book_new: (): unknown => getXLSX().utils.book_new(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    book_append_sheet: (wb: unknown, ws: unknown, name: string): void =>
      getXLSX().utils.book_append_sheet(wb, ws, name),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  writeFile: (wb: unknown, filename: string): void =>
    getXLSX().writeFile(wb, filename),
};

export default XLSX;
