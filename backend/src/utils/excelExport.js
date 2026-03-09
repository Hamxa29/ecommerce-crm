import ExcelJS from 'exceljs';

/**
 * Build and stream an Excel file directly to the response.
 * @param {import('express').Response} res
 * @param {{ filename: string, sheetName: string, columns: Array<{header,key,width}>, rows: object[] }} opts
 */
export async function sendExcel(res, { filename, sheetName, columns, rows }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);

  ws.columns = columns;

  // Style header row
  const headerRow = ws.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Add data rows
  rows.forEach((row, i) => {
    const r = ws.addRow(row);
    if (i % 2 === 1) {
      r.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      });
    }
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await wb.xlsx.write(res);
  res.end();
}
