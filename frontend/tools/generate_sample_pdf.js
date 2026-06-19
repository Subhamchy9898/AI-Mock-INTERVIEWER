import fs from 'fs';
import { jsPDF } from 'jspdf';

const now = new Date();
const formattedDate = now.toLocaleString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const doc = new jsPDF({ unit: 'pt', format: 'a4' });
const pageWidth = doc.internal.pageSize.getWidth();
const margin = 40;

doc.setFillColor('#2563eb');
doc.rect(0, 0, pageWidth, 140, 'F');
doc.setFont('helvetica', 'bold');
doc.setTextColor('#ffffff');
doc.setFontSize(24);
doc.text('AI Mock Interview Assessment Report', margin, 84);
doc.setFontSize(11);
doc.setTextColor('#dbeafe');
doc.text(`Generated: ${formattedDate}`, margin, 102);
doc.text('Candidate: Test Candidate', margin, 118);
doc.setFontSize(10);
doc.setTextColor('#f8fafc');
doc.text('Professional interview reporting with insight-driven performance analysis.', margin, 132);
doc.addPage();

const out = 'sample-report-test.pdf';
const buffer = doc.output('arraybuffer');
fs.writeFileSync(out, Buffer.from(buffer));
console.log('created', out);
