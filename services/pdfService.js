const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');


const generateEarningsPDF = async (report, user) => {
  return new Promise((resolve, reject) => {
    try {
      const filename = `earnings_report_${user._id}.pdf`;
      const filePath = path.join(__dirname, '../pdfs', filename); // Ensure folder exists
      
      const doc = new PDFDocument();
      doc.pipe(fs.createWriteStream(filePath));


      doc.fontSize(20).text('Task Earnings Report', { align: 'center' }).moveDown(0.5);
      doc.fontSize(14).text(`Time Period: ${report.timeRange}`, { underline: true }).moveDown(0.2);
      doc.fontSize(12).text(`Total Earnings: $${report.totalEarnings}`).text(`Completed Tasks: ${report.totalTasks}`).moveDown(1);
      
      doc.end();


      // Wait for PDF to finish writing before resolving
      doc.on('finish', () => {
        resolve({ filePath, filename });
      });
    } catch (error) {
      reject(error);
    }
  });
};


module.exports = { generateEarningsPDF };
