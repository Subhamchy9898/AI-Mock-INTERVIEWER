import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';

function safeNumber(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function generatePdf(finalReport, profile, outFile) {
  const now = new Date();
  const formattedDate = now.toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const possibleNames = [
    finalReport && (finalReport.candidateName || finalReport.name),
    finalReport && finalReport.candidate && (finalReport.candidate.name || finalReport.candidate.fullName),
    profile && (profile.name || profile.fullName || profile.candidateName),
  ];
  const sanitizeName = (n) => (typeof n === 'string' && n.trim() && !/\.pdf$/i.test(n) ? n.trim() : null);
  let candidateName = null;
  for (const n of possibleNames) {
    const s = sanitizeName(n);
    if (s && /[a-zA-Z]/.test(s) && s.length > 1) { candidateName = s; break; }
  }

  const technicalScore = safeNumber(finalReport.technicalScore) ?? null;
  const projectScore = safeNumber(finalReport.projectScore) ?? null;
  const hrScore = safeNumber(finalReport.hrScore) ?? null;
  const communicationScore = safeNumber(finalReport.communicationScore) ?? hrScore ?? null;
  const overallScore = safeNumber(finalReport.overallScore) ?? ((technicalScore !== null || projectScore !== null || hrScore !== null)
    ? Math.round(((technicalScore || 0) + (projectScore || 0) + (hrScore || 0)) / 3)
    : null);

  const safeText = (value, fallback = 'No data provided') => {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && !isNaN(value)) return String(value);
    return fallback;
  };

  const formatPercent = (value) => (typeof value === 'number' && !isNaN(value) ? `${value}%` : 'Not provided');
  const getStatus = (score) => {
    if (typeof score !== 'number' || isNaN(score)) return 'Not provided';
    if (score >= 85) return 'Strong Hire';
    if (score >= 70) return 'Hire';
    if (score >= 50) return 'Borderline';
    return 'Needs Improvement';
  };

  const trimItems = (items, maxItems = 5) => {
    if (!Array.isArray(items) || !items.length) return [
      'No data provided'
    ];
    return items
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') return safeText(item.title || item.name || item.label || item.summary || item.description);
        return safeText(String(item));
      })
      .filter(Boolean)
      .slice(0, maxItems);
  };

  const technicalStrengths = trimItems(finalReport.technicalStrengths || finalReport.keyStrengths || finalReport.strengths, 4);
  const technicalWeaknesses = trimItems(finalReport.technicalWeaknesses || finalReport.keyWeaknesses || finalReport.weaknesses, 4);
  const strengths = trimItems(finalReport.strengths, 5);
  const weaknesses = trimItems(finalReport.weaknesses, 5);
  const skillGaps = trimItems(finalReport.skillGaps || finalReport.skillGapsIdentified, 5);

  const recommendation = safeText(finalReport.recommendation, 'No recommendation available');
  const projectUnderstanding = safeText(finalReport.projectUnderstanding || finalReport.projectSummary, 'Not provided');
  const contributionEvaluation = safeText(finalReport.contributionEvaluation || finalReport.contribution, 'Not provided');
  const confidenceLevel = safeText(finalReport.confidenceLevel, 'Not provided');
  const professionalismFeedback = safeText(finalReport.professionalismFeedback || finalReport.professionalism, 'Not provided');

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const columnGap = 18;
  const columnWidth = (pageWidth - margin * 2 - columnGap) / 2;
  let yLeft = 88;
  let yRight = 88;

  const renderHeading = (text, x, yPos) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor('#0f172a');
    doc.text(text, x, yPos);
    return yPos + 14;
  };

  const renderField = (label, value, x, yPos, width) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor('#0f172a');
    doc.text(`${label}:`, x, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(value, width - 72);
    doc.text(lines, x + 70, yPos);
    return yPos + lines.length * 12 + 6;
  };

  const renderBullets = (items, x, yPos, width, maxItems = 5) => {
    const bullets = items.length ? items.slice(0, maxItems) : ['No data provided'];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor('#1f2937');
    let currentY = yPos;
    bullets.forEach((item) => {
      const wrapped = doc.splitTextToSize(`• ${item}`, width - 10);
      doc.text(wrapped, x + 6, currentY);
      currentY += wrapped.length * 12 + 4;
    });
    return currentY;
  };

  const renderLimitedText = (text, x, yPos, width, maxLines = 6) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor('#1f2937');
    const lines = doc.splitTextToSize(text, width);
    const shown = lines.slice(0, maxLines);
    if (lines.length > maxLines) {
      shown[shown.length - 1] = `${shown[shown.length - 1].replace(/\s+$/u, '')}…`;
    }
    doc.text(shown, x, yPos);
    return yPos + shown.length * 12 + 6;
  };

  doc.setFillColor('#1d4ed8');
  doc.rect(0, 0, pageWidth, 72, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor('#ffffff');
  doc.text('AI Mock Interview Assessment Report', margin, 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor('#dbeafe');
  if (candidateName) {
    doc.text(`Candidate: ${candidateName}`, margin, 46);
  }
  doc.text(`Date Generated: ${formattedDate}`, margin, candidateName ? 60 : 46);

  const leftX = margin;
  const rightX = margin + columnWidth + columnGap;

  yLeft = renderHeading('Candidate Information', leftX, yLeft);
  yLeft = renderField('Name', candidateName || 'Not provided', leftX, yLeft, columnWidth);
  yLeft = renderField('Date', formattedDate, leftX, yLeft, columnWidth);
  yLeft = renderField('Overall Score', formatPercent(overallScore), leftX, yLeft, columnWidth);
  yLeft = renderField('Recommendation Status', getStatus(overallScore), leftX, yLeft, columnWidth);

  yLeft += 8;
  yLeft = renderHeading('Technical Assessment', leftX, yLeft);
  yLeft = renderField('Technical Score', formatPercent(technicalScore), leftX, yLeft, columnWidth);
  yLeft = renderHeading('Key Strengths', leftX, yLeft);
  yLeft = renderBullets(technicalStrengths, leftX, yLeft, columnWidth);
  yLeft = renderHeading('Key Weaknesses', leftX, yLeft);
  yLeft = renderBullets(technicalWeaknesses, leftX, yLeft, columnWidth);

  yLeft += 8;
  yLeft = renderHeading('Project Assessment', leftX, yLeft);
  yLeft = renderField('Project Score', formatPercent(projectScore), leftX, yLeft, columnWidth);
  yLeft = renderField('Project Understanding', projectUnderstanding, leftX, yLeft, columnWidth);
  yLeft = renderField('Contribution Evaluation', contributionEvaluation, leftX, yLeft, columnWidth);

  yLeft += 8;
  yLeft = renderHeading('HR Assessment', leftX, yLeft);
  yLeft = renderField('Communication Score', formatPercent(communicationScore), leftX, yLeft, columnWidth);
  yLeft = renderField('Confidence Level', confidenceLevel, leftX, yLeft, columnWidth);
  yLeft = renderField('Professionalism Feedback', professionalismFeedback, leftX, yLeft, columnWidth);

  yRight = renderHeading('Strengths', rightX, yRight);
  yRight = renderBullets(strengths, rightX, yRight, columnWidth);

  yRight += 8;
  yRight = renderHeading('Areas for Improvement', rightX, yRight);
  yRight = renderBullets(weaknesses, rightX, yRight, columnWidth);

  yRight += 8;
  yRight = renderHeading('Skill Gaps Identified', rightX, yRight);
  yRight = renderBullets(skillGaps, rightX, yRight, columnWidth);

  yRight += 8;
  yRight = renderHeading('Final Recommendation', rightX, yRight);
  yRight = renderLimitedText(recommendation, rightX, yRight, columnWidth, 6);

  const footerY = pageHeight - 24;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor('#64748b');
  doc.text('AI Mock Interviewer • Single-page recruiter assessment sheet.', margin, footerY);
  doc.text(`Generated ${formattedDate}`, pageWidth - margin, footerY, { align: 'right' });

  const buffer = doc.output('arraybuffer');
  fs.writeFileSync(outFile, Buffer.from(buffer));
}

function inspectPdfForIssues(filePath) {
  const data = fs.readFileSync(filePath);
  const text = data.toString('utf8');
  const issues = [];
  if (text.includes('[object Object]')) issues.push('[object Object] found');
  // Check Candidate line
  const hasCandidateLine = text.includes('Candidate:');
  return { filePath, issues, hasCandidateLine, rawText: text };
}

async function run() {
  const outDir = path.join(process.cwd(), 'tmp_reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const samples = [
    {
      name: 'case1_name_in_finalReport',
      finalReport: { candidateName: 'Alice Example', technicalScore: 88, projectScore: 75, hrScore: 80, overallScore: 81, strengths: ['Great algorithms'], weaknesses: ['Needs clarity'], recommendation: 'Hire', technicalSummary: 'Solid tech skills.' },
      profile: { skills: ['JavaScript', 'React'], projects: [{ name: 'Project X', description: 'A sample project' }], experience: [{ title: 'Developer', company: 'Acme' }], education: [{ degree: 'BSc CS', institution: 'State University', year: '2020' }], certifications: [{ certification: 'Cert A', issuer: 'Issuer' }] }
    },
    {
      name: 'case2_name_in_profile',
      finalReport: { technicalScore: 70, projectScore: 68, hrScore: 72, strengths: ['Good communication'], weaknesses: ['Lacks depth'], recommendation: 'Consider' },
      profile: { name: 'Bob Sample', skills: ['Python'], projects: [{ project: 'Proj Y', summary: 'Worked on Y' }], experience: [{ role: 'Engineer', company: 'Beta' }], education: [{ degree: 'MSc', institution: 'Tech Institute' }], certifications: [] }
    },
    {
      name: 'case3_no_name',
      finalReport: { technicalScore: 50, projectScore: 45, hrScore: 60, strengths: [], weaknesses: [], recommendation: 'Borderline' },
      profile: { skills: [], projects: [], experience: [], education: [], certifications: [] }
    }
  ];

  const results = [];
  for (const s of samples) {
    const outFile = path.join(outDir, `${s.name}.pdf`);
    generatePdf(s.finalReport, s.profile, outFile);
    const res = inspectPdfForIssues(outFile);
    results.push({ sample: s.name, outFile, ...res });
  }

  console.log(JSON.stringify(results, null, 2));
  // Simple failure if any issues found
  let failed = false;
  for (const r of results) {
    if (r.issues.length) failed = true;
    if (r.sample === 'case3_no_name' && r.hasCandidateLine) {
      console.error('Failure: candidate line present when no name provided in case3'); failed = true;
    }
  }
  if (failed) process.exit(2);
  process.exit(0);
}

run();
