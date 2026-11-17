const PDFDocument = require('pdfkit');

function generatePayslipPdfBuffer({ payroll, employee, company }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const companyName = company?.companyName || 'Enterprise HR Corp';
    const companyAddr = company?.address || '';
    const companyEmail = company?.officialEmail || '';
    const currency = employee?.salary?.currency || 'INR';

    const formatMoney = (n) =>
      `${currency} ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Header band
    doc.rect(0, 0, doc.page.width, 96).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text(companyName, 48, 28);
    doc.fontSize(10).font('Helvetica').fillColor('#cbd5e1').text(companyAddr, 48, 54);
    doc.text(companyEmail, 48, 68);

    doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text('PAYSLIP', 400, 32, { align: 'right', width: 147 });
    doc.fontSize(10).font('Helvetica').fillColor('#93c5fd').text(`Period: ${payroll.salaryMonth}`, 400, 54, { align: 'right', width: 147 });

    doc.moveDown(3);
    doc.fillColor('#0f172a');

    // Employee Info Box
    const infoTop = 120;
    doc.roundedRect(48, infoTop, 499, 92, 6).stroke('#cbd5e1');
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e3a8a').text('Employee Information', 62, infoTop + 12);

    doc.font('Helvetica').fontSize(10).fillColor('#334155');
    const empName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
    doc.text(`Name: ${empName}`, 62, infoTop + 34);
    doc.text(`Employee ID: ${employee.employeeId || '-'}`, 62, infoTop + 52);
    doc.text(`Department: ${employee.department?.name || '-'}`, 62, infoTop + 70);

    doc.text(`Designation: ${employee.designation || '-'}`, 310, infoTop + 34);
    doc.text(`Payment Status: ${payroll.paymentStatus}`, 310, infoTop + 52);
    doc.text(
      `Payment Date: ${payroll.paymentDate ? new Date(payroll.paymentDate).toISOString().slice(0, 10) : 'Pending'}`,
      310,
      infoTop + 70
    );

    // Earnings & Deductions Table
    const tableTop = 236;
    doc.rect(48, tableTop, 499, 28).fill('#f1f5f9');
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10);
    doc.text('Earnings / Component', 62, tableTop + 9);
    doc.text('Amount', 400, tableTop + 9, { width: 135, align: 'right' });

    const rows = [
      { label: 'Basic Salary', amount: payroll.basicSalary },
      { label: 'House Rent Allowance (HRA)', amount: payroll.houseRentAllowance },
      { label: 'Other Allowances', amount: payroll.otherAllowances },
      { label: 'Bonus / Incentives', amount: payroll.bonus },
      { label: 'Deductions', amount: -Math.abs(payroll.deductions || 0), isDeduction: true },
    ];

    let y = tableTop + 38;
    doc.font('Helvetica').fontSize(10);
    rows.forEach((row) => {
      doc.fillColor(row.isDeduction ? '#b91c1c' : '#1e293b');
      doc.text(row.label, 62, y);
      doc.text(
        row.isDeduction ? `- ${formatMoney(Math.abs(row.amount))}` : formatMoney(row.amount),
        400,
        y,
        { width: 135, align: 'right' }
      );
      y += 26;
      doc.moveTo(48, y - 6).lineTo(547, y - 6).strokeColor('#e2e8f0').stroke();
    });

    // Net Salary Summary
    const netTop = y + 12;
    doc.roundedRect(48, netTop, 499, 44, 6).fill('#eff6ff').stroke('#1d4ed8');
    doc.fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(13).text('NET SALARY PAYABLE', 64, netTop + 14);
    doc.fillColor('#0f172a').fontSize(14).text(formatMoney(payroll.netSalary), 360, netTop + 14, { width: 175, align: 'right' });

    if (payroll.notes) {
      doc.moveDown(3);
      doc.fillColor('#475569').font('Helvetica-Oblique').fontSize(9).text(`Notes: ${payroll.notes}`, 48, netTop + 62);
    }

    // Footer disclaimer
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#64748b')
      .text(
        'This is a computer-generated internal payroll statement recorded by the Enterprise HR Management System. It does not constitute a statutory tax filing or bank transfer receipt.',
        48,
        755,
        { width: 499, align: 'center' }
      );

    doc.end();
  });
}

function generateReportPdfBuffer({ title, subtitle, columns, rows, company }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const companyName = company?.companyName || 'Enterprise HR Corp';
    doc.rect(0, 0, doc.page.width, 64).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text(companyName, 40, 16);
    doc.fontSize(10).font('Helvetica').fillColor('#93c5fd').text(title, 40, 38);
    doc.fillColor('#cbd5e1').fontSize(9).text(`Generated: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`, 540, 26, { width: 260, align: 'right' });

    if (subtitle) {
      doc.fillColor('#334155').fontSize(9).text(subtitle, 40, 76);
    }

    const usableWidth = doc.page.width - 80;
    const colWidth = usableWidth / Math.max(columns.length, 1);
    let y = subtitle ? 98 : 82;

    const drawHeader = () => {
      doc.rect(40, y, usableWidth, 24).fill('#e2e8f0');
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5);
      columns.forEach((col, i) => {
        doc.text(col.label, 44 + i * colWidth, y + 7, { width: colWidth - 8, ellipsis: true });
      });
      y += 28;
    };

    drawHeader();

    doc.font('Helvetica').fontSize(8.5);
    rows.forEach((row, idx) => {
      if (y > doc.page.height - 60) {
        doc.addPage({ margin: 40, size: 'A4', layout: 'landscape' });
        y = 40;
        drawHeader();
        doc.font('Helvetica').fontSize(8.5);
      }
      if (idx % 2 === 1) {
        doc.rect(40, y - 3, usableWidth, 20).fill('#f8fafc');
      }
      doc.fillColor('#1e293b');
      columns.forEach((col, i) => {
        const raw = typeof col.value === 'function' ? col.value(row) : row[col.key];
        doc.text(raw !== undefined && raw !== null ? String(raw) : '-', 44 + i * colWidth, y, {
          width: colWidth - 8,
          height: 16,
          ellipsis: true,
        });
      });
      y += 20;
    });

    if (rows.length === 0) {
      doc.fillColor('#64748b').fontSize(10).text('No records matched the selected filter criteria.', 40, y + 12);
    }

    doc.end();
  });
}

module.exports = { generatePayslipPdfBuffer, generateReportPdfBuffer };
