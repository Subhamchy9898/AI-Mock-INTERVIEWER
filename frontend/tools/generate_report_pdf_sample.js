import fs from 'fs';
import { jsPDF } from 'jspdf';

const finalReport = {
  candidateName: 'Aisha Patel',
  technicalScore: 88,
  projectScore: 82,
  hrScore: 75,
  communicationScore: 80,
  overallScore: 82,
  strengths: [
    'Clear technical fundamentals',
    'Strong project ownership and initiative',
    'Confident communication with structured responses',
  ],
  weaknesses: [
    'Could add more concrete metrics to project examples',
    'Needs to better align examples to role requirements',
  ],
  recommendation: 'Strong candidate with solid technical fundamentals; recommend next-stage interview focusing on leadership and system design.',
  technicalSummary: 'Candidate demonstrated a strong understanding of core concepts like algorithms, data structures, and system design. Their answers were concise and accurate.',
  projectSummary: 'Project examples were relevant and showed ownership. The candidate described tradeoffs clearly and identified key challenges effectively.',
  communicationSummary: 'Communication was clear and professional. The candidate structured responses logically and maintained good pacing.',
  hrSummary: 'Candidate showed cultural fit and career motivation. They communicated goals and strengths aligned with the team objectives.',
};

const profile = {
  skills: [
    'JavaScript',
    'React',
    'Node.js',
    'REST APIs',
    'SQL',
    { title: 'Testing', description: 'Jest, Cypress, end-to-end automation' },
  ],
  projects: [
    {
      name: 'Interview Ready App',
      description: 'Built a browser-based interview practice platform using React and AI-driven reporting.',
      role: 'Lead developer',
      technologies: ['React', 'Node.js', 'jsPDF'],
      year: '2025',
    },
    { name: 'Resume Parser', summary: 'Extracted candidate skills and generated interview questions automatically.' },
  ],
  experience: [
    { company: 'TechNova', role: 'Software Engineer', from: '2022', to: '2025' },
    { company: 'ByteWorks', role: 'Junior Developer', from: '2020', to: '2022' },
  ],
  education: [
    { degree: 'B.Sc. Computer Science', institution: 'State University', year: '2020' },
  ],
  certifications: [
    { certification: 'AWS Certified Developer', issuer: 'Amazon', year: '2024' },
  ],
};

const now = new Date();
const formattedDate = now.toLocaleString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const createReportPdf = ({ finalReport, profile }) => {
  const sanitizeName = (n) => (typeof n === 'string' && n.trim() && !/\.pdf$/i.test(n) ? n.trim() : null);
  const possibleNames = [
    finalReport && (finalReport.candidateName || finalReport.name),
    finalReport && finalReport.candidate && (finalReport.candidate.name || finalReport.candidate.fullName),
    profile && (profile.name || profile.fullName || profile.candidateName),
  ];
  let candidateName = null;
  for (const n of possibleNames) {
    const s = sanitizeName(n);
    if (s && /[a-zA-Z]/.test(s) && s.length > 1) {
      candidateName = s;
      break;
    }
  }

  const parseScore = (value) => {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const technicalScore = parseScore(finalReport.technicalScore);
  const projectScore = parseScore(finalReport.projectScore);
  const hrScore = parseScore(finalReport.hrScore);
  const communicationScore = parseScore(finalReport.communicationScore) ?? hrScore;
  const overallScore = parseScore(finalReport.overallScore) ?? (technicalScore !== null && projectScore !== null && hrScore !== null ? Math.round((technicalScore + projectScore + hrScore) / 3) : null);
  const strengths = Array.isArray(finalReport.strengths) && finalReport.strengths.length ? finalReport.strengths : ['No data available'];
  const weaknesses = Array.isArray(finalReport.weaknesses) && finalReport.weaknesses.length ? finalReport.weaknesses : ['No data available'];
  const recommendation = finalReport.recommendation || 'No data available';
  const skills = Array.isArray(profile.skills) && profile.skills.length ? profile.skills : ['No data available'];
  const projects = Array.isArray(profile.projects) && profile.projects.length ? profile.projects : ['No data available'];
  const experience = Array.isArray(profile.experience) && profile.experience.length ? profile.experience : ['No data available'];
  const education = Array.isArray(profile.education) && profile.education.length ? profile.education : ['No data available'];
  const certifications = Array.isArray(profile.certifications) && profile.certifications.length ? profile.certifications : ['No data available'];

  const getStatus = (score) => {
    if (score >= 85) return 'Strong Hire';
    if (score >= 70) return 'Hire';
    if (score >= 50) return 'Borderline';
    return 'Needs Improvement';
  };

  const getColor = (score) => {
    if (score >= 85) return '#16a34a';
    if (score >= 70) return '#f97316';
    return '#dc2626';
  };

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 50;

  const drawProgressBar = (x, yPos, width, height, score) => {
    const safeScore = typeof score === 'number' && !isNaN(score) ? Math.max(0, Math.min(100, score)) : 0;
    doc.setFillColor('#e2e8f0');
    doc.roundedRect(x, yPos, width, height, 6, 6, 'F');
    doc.setFillColor(getColor(safeScore));
    const fillWidth = safeScore > 0 ? Math.max((safeScore / 100) * width, 6) : 6;
    doc.roundedRect(x, yPos, fillWidth, height, 6, 6, 'F');
  };

  const addBulletList = (list, x, yPos, maxWidth) => {
    const lineHeight = 16;
    doc.setFontSize(10);
    doc.setTextColor('#0f172a');
    const toText = (it) => {
      if (it == null) return 'No data available';
      if (typeof it === 'string') return it;
      if (Array.isArray(it)) return it.map((i) => (typeof i === 'string' ? i : JSON.stringify(i))).join(', ');
      if (typeof it === 'object') {
        const title = it.name || it.title || it.project || it.degree || it.certification || it.label || 'Untitled';
        const fields = [title];
        if (it.description || it.summary) fields.push(it.description || it.summary);
        if (it.role) fields.push(it.role);
        if (it.institution) fields.push(it.institution);
        if (it.company) fields.push(it.company);
        if (it.issuer) fields.push(it.issuer);
        if (it.year) fields.push(it.year);
        if (it.from || it.start) fields.push(`${it.from || it.start}${it.to || it.end ? ` – ${it.to || it.end}` : ''}`);
        if (it.technologies && Array.isArray(it.technologies)) fields.push(it.technologies.join(', '));
        return fields.filter(Boolean).join(' — ');
      }
      try {
        return String(it);
      } catch (e) {
        return '';
      }
    };

    list.forEach((item) => {
      const itemText = `• ${toText(item)}`;
      const lines = doc.splitTextToSize(itemText, maxWidth);
      doc.text(lines, x, yPos);
      yPos += lines.length * lineHeight;
    });
    return yPos;
  };

  const pdfLinesForItem = (item) => {
    if (item == null) return ['No data available'];
    if (typeof item === 'string') return [item];
    if (Array.isArray(item)) return item.flatMap((it) => (typeof it === 'string' ? [it] : pdfLinesForItem(it)));
    if (typeof item === 'object') {
      const title = item.name || item.title || item.project || item.degree || item.certification || item.label || 'Untitled';
      const lines = [String(title)];
      if (item.description || item.summary) lines.push(item.description || item.summary);
      if (item.role) lines.push(item.role);
      if (item.company) lines.push(item.company);
      if (item.institution) lines.push(item.institution);
      if (item.issuer) lines.push(item.issuer);
      if (item.year) lines.push(item.year);
      if (item.from || item.start) {
        const range = `${item.from || item.start}${item.to || item.end ? ` – ${item.to || item.end}` : ''}`;
        lines.push(range);
      }
      if (item.technologies && Array.isArray(item.technologies)) lines.push(item.technologies.join(', '));
      return lines.filter(Boolean);
    }
    return [String(item)];
  };

  const headerHeight = 130;
  doc.setFillColor('#2563eb');
  doc.rect(0, 0, pageWidth, headerHeight, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#ffffff');
  doc.setFontSize(24);
  doc.text('AI Mock Interview Assessment Report', margin, 78);
  doc.setFontSize(11);
  doc.setTextColor('#dbeafe');
  doc.text(`Generated: ${formattedDate}`, margin, 96);
  if (candidateName) {
    doc.text(`Candidate: ${candidateName}`, margin, 112);
  }
  doc.setFontSize(10);
  doc.setTextColor('#f8fafc');
  doc.text('Professional interview reporting with insight-driven performance analysis.', margin, 128);

  y = headerHeight + 24;

  doc.setFontSize(16);
  doc.setTextColor('#0f172a');
  doc.setFont('helvetica', 'bold');
  doc.text('AI Mock Interviewer', margin, y);
  doc.setFontSize(10);
  doc.setTextColor('#64748b');
  doc.text(`Report generated: ${formattedDate}`, pageWidth - margin - 220, y, { align: 'left' });
  y += 28;
  doc.setDrawColor('#e2e8f0');
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 26;

  doc.setFontSize(12);
  doc.setTextColor('#2563eb');
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', margin, y);
  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#0f172a');
  doc.setFontSize(10);
  if (overallScore === null) {
    doc.text('Evaluation unavailable because AI service could not process responses at this time.', margin, y, { maxWidth: pageWidth - margin * 2 });
    y += 24;
  } else {
    doc.text(`Overall Interview Score: ${overallScore}%`, margin, y);
    doc.text(`Recommendation Status: ${getStatus(overallScore)}`, margin + 260, y);
    y += 24;
    doc.setFontSize(9);
    doc.setTextColor('#475569');
    doc.text(recommendation, margin, y, { maxWidth: pageWidth - margin * 2 });
    y += 36;
  }

  doc.setFontSize(12);
  doc.setTextColor('#2563eb');
  doc.setFont('helvetica', 'bold');
  doc.text('Score Dashboard', margin, y);
  y += 18;

  const scoreBoxes = [
    { label: 'Technical', score: technicalScore },
    { label: 'Project', score: projectScore },
    { label: 'HR', score: hrScore },
    { label: 'Communication', score: communicationScore },
    { label: 'Overall', score: overallScore },
  ];

  scoreBoxes.forEach((box) => {
    if (y > 680) {
      doc.addPage();
      y = 50;
    }
    const boxWidth = pageWidth - margin * 2;
    const labelTop = y + 14;
    doc.setDrawColor('#e2e8f0');
    const boxHeight = 64;
    doc.roundedRect(margin, y, boxWidth, boxHeight, 10, 10, 'S');
    doc.setFontSize(12);
    doc.setTextColor('#0f172a');
    doc.setFont('helvetica', 'bold');
    doc.text(box.label, margin + 14, labelTop);
    doc.setFontSize(11);
    doc.setTextColor('#475569');
    const scoreText = typeof box.score === 'number' && box.score !== null ? `${box.score}%` : 'N/A';
    doc.text(scoreText, pageWidth - margin - 56, labelTop);
    const progressY = y + 34;
    drawProgressBar(margin + 14, progressY, boxWidth - 84, 12, box.score);
    y += boxHeight + 14;
  });

  y += 10;
  doc.setFontSize(12);
  doc.setTextColor('#2563eb');
  doc.setFont('helvetica', 'bold');
  doc.text('Candidate Profile', margin, y);
  y += 18;
  doc.setFontSize(10);
  doc.setTextColor('#475569');

  const profileColumns = [
    { title: 'Skills Detected', items: skills },
    { title: 'Projects Detected', items: projects },
    { title: 'Experience Detected', items: experience },
    { title: 'Education', items: education },
    { title: 'Certifications', items: certifications },
  ];

  const columnWidth = (pageWidth - margin * 2 - 20) / 2;
  let columnX = margin;
  let rowY = y;

  profileColumns.forEach((section, index) => {
    if (index > 0 && index % 2 === 0) {
      rowY += 12;
      columnX = margin;
    }

    const items = Array.isArray(section.items) && section.items.length ? section.items : ['No data available'];
    const itemLinesArray = items.slice(0, 6).map((it) => pdfLinesForItem(it));
    const lineHeight = 12;
    let requiredHeight = 32;
    itemLinesArray.forEach((lines) => {
      requiredHeight += lines.length * lineHeight + 6;
    });
    const boxHeight = Math.max(80, requiredHeight + 12);

    if (rowY + boxHeight > 750) {
      doc.addPage();
      rowY = 50;
    }

    doc.setDrawColor('#e2e8f0');
    doc.roundedRect(columnX, rowY, columnWidth, boxHeight, 12, 12, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor('#0f172a');
    doc.text(section.title, columnX + 12, rowY + 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    let listY = rowY + 32;
    itemLinesArray.forEach((lines) => {
      lines.forEach((ln) => {
        const wrapped = doc.splitTextToSize(`• ${ln}`, columnWidth - 24);
        doc.text(wrapped, columnX + 12, listY);
        listY += wrapped.length * 12 + 4;
      });
    });

    columnX += columnWidth + 20;
    if (index % 2 === 1) {
      rowY += boxHeight + 12;
      columnX = margin;
    }
  });

  y = rowY + 24;
  if (y > 720) {
    doc.addPage();
    y = 50;
  }

  doc.setFontSize(12);
  doc.setTextColor('#2563eb');
  doc.setFont('helvetica', 'bold');
  doc.text('Interview Performance Analysis', margin, y);
  y += 24;

  const performanceSummaries = [
    { title: 'Technical Assessment', text: finalReport.technicalSummary || 'Data unavailable due to temporary AI service limitation.' },
    { title: 'Project Assessment', text: finalReport.projectSummary || 'Data unavailable due to temporary AI service limitation.' },
    { title: 'Communication Assessment', text: finalReport.communicationSummary || 'Data unavailable due to temporary AI service limitation.' },
    { title: 'HR Assessment', text: finalReport.hrSummary || 'Data unavailable due to temporary AI service limitation.' },
  ];

  performanceSummaries.forEach((section) => {
    if (y > 710) {
      doc.addPage();
      y = 50;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor('#0f172a');
    doc.text(section.title, margin, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const sectionLines = doc.splitTextToSize(section.text, pageWidth - margin * 2);
    doc.text(sectionLines, margin, y);
    y += sectionLines.length * 14 + 18;
  });

  if (y > 620) {
    doc.addPage();
    y = 50;
  }

  doc.setFontSize(12);
  doc.setTextColor('#2563eb');
  doc.setFont('helvetica', 'bold');
  doc.text('Strengths', margin, y);
  y += 18;
  y = addBulletList(strengths, margin, y, pageWidth - margin * 2);
  y += 18;

  if (y > 710) {
    doc.addPage();
    y = 50;
  }

  doc.setFontSize(12);
  doc.setTextColor('#2563eb');
  doc.setFont('helvetica', 'bold');
  doc.text('Improvement Areas', margin, y);
  y += 18;
  y = addBulletList(weaknesses, margin, y, pageWidth - margin * 2);
  y += 30;

  if (y > 680) {
    doc.addPage();
    y = 50;
  }

  doc.setFontSize(12);
  doc.setTextColor('#2563eb');
  doc.setFont('helvetica', 'bold');
  doc.text('Interview Readiness', margin, y);
  y += 18;
  let readiness = 'Unavailable';
  if (overallScore !== null && typeof overallScore === 'number') {
    readiness = overallScore >= 85 ? 'Excellent' : overallScore >= 70 ? 'Good' : overallScore >= 50 ? 'Average' : 'Needs Preparation';
  }
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#0f172a');
  doc.text(`Readiness Rating: ${readiness}`, margin, y);
  y += 22;
  drawProgressBar(margin, y, pageWidth - margin * 2, 14, overallScore);
  y += 40;

  doc.setFontSize(9);
  doc.setTextColor('#64748b');
  doc.text('Generated by AI Mock Interviewer | AI-Powered Interview Assessment', margin, 780);
  doc.text(`Timestamp: ${formattedDate}`, margin, 796);

  return doc;
};

const doc = createReportPdf({ finalReport, profile });
const out = 'sample-interview-report.pdf';
const buffer = doc.output('arraybuffer');
fs.writeFileSync(out, Buffer.from(buffer));
console.log('Created', out);
