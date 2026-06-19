require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const { GoogleGenAI } = require("@google/genai");

const app = express();

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const isAIQuotaError = (err) => {
  const text = String(err?.message || err?.code || err?.status || "").toLowerCase();
  return /quota|rate limit|429/.test(text);
};

const isAIUnavailableError = (err) => {
  const text = String(err?.message || err?.code || err?.status || "").toLowerCase();
  return /503|unavailable|service unavailable|timeout|gateway/i.test(text);
};

const formatAIError = (err) => {
  const message = String(err?.message || err) || "AI service error";
  if (isAIQuotaError(err)) {
    return {
      status: 503,
      code: "AI_SERVICE_UNAVAILABLE",
      message: "AI service temporarily unavailable due to quota or rate limits. Please try again later.",
    };
  }

  if (isAIUnavailableError(err)) {
    return {
      status: 503,
      code: "AI_SERVICE_UNAVAILABLE",
      message: "AI service temporarily unavailable. Please try again later.",
    };
  }

  if (/json|parse/i.test(message)) {
    return {
      status: 502,
      code: "AI_PARSE_FAILED",
      message: "AI generation failed while processing the resume. Please try again.",
    };
  }

  return {
    status: 500,
    code: "AI_ERROR",
    message: "An unexpected AI service error occurred. Please try again later.",
  };
};

// =====================
// Multer Storage
// =====================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// =====================
// Test Route
// =====================

app.get("/", (req, res) => {
  res.send("AI Mock Interviewer Backend Running 🚀");
});

// =====================
// Upload Resume Route
// =====================

app.post("/upload-resume", upload.single("resume"), async (req, res) => {
  try {
    console.log("Resume upload received");

    if (!req.file) {
      return res.status(400).json({ error: "No resume uploaded" });
    }

    const pdfBuffer = fs.readFileSync(req.file.path);
    const parsedPDF = await pdfParse(pdfBuffer);
    const resumeText = parsedPDF.text;

    if (!resumeText || !resumeText.trim()) {
      return res.status(422).json({
        error: "Empty resume file. Please upload a valid PDF with readable text.",
        code: "EMPTY_RESUME",
      });
    }

    const prompt = `
You are an expert technical interviewer.

Analyze the resume below.

Return ONLY valid JSON with the following structure:
{
  "skills": [],
  "projects": [],
  "experience": [],
  "education": [],
  "certifications": [],
  "questions": [
    {
      "type": "Technical|Project|HR",
      "question": "..."
    }
  ]
}

Extract concise, high-value resume details for a candidate profile dashboard and generate interview questions.
When an item is missing, return an empty array.
Resume:
${resumeText}
`;

    let parsedData;

    try {
      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      const aiText = String(result.text || "").trim();

      if (!aiText) {
        throw new Error("Gemini returned empty content");
      }

      console.log("===== GEMINI RESPONSE =====");
      console.log(aiText);
      console.log("==========================");

      const cleaned = aiText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      parsedData = JSON.parse(cleaned);
    } catch (error) {
      console.log("Gemini Error / JSON Parse Error");
      console.log(error);

      const aiError = formatAIError(error);
      return res.status(aiError.status).json({
        error: aiError.message,
        code: aiError.code,
      });
    } finally {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    if (!Array.isArray(parsedData.skills)) parsedData.skills = [];
    if (!Array.isArray(parsedData.projects)) parsedData.projects = [];
    if (!Array.isArray(parsedData.experience)) parsedData.experience = [];
    if (!Array.isArray(parsedData.education)) parsedData.education = [];
    if (!Array.isArray(parsedData.certifications)) parsedData.certifications = [];
    if (!Array.isArray(parsedData.questions)) parsedData.questions = [];

    res.json({
      message: "Resume processed successfully",
      resumeText,
      skills: parsedData.skills,
      projects: parsedData.projects,
      experience: parsedData.experience,
      education: parsedData.education,
      certifications: parsedData.certifications,
      questions: parsedData.questions,
    });
  } catch (error) {
    console.error("SERVER ERROR:", error);
    res.status(500).json({ error: "Failed to process resume" });
  }
});

// =====================
// Answer Evaluation Route
// =====================

app.post("/evaluate-answer", async (req, res) => {
  try {
    const { question, answer } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ error: "Question and answer are required" });
    }

    const prompt = `
You are an expert technical interviewer and evaluator.
Evaluate this answer using a score from 1 to 10.
Return ONLY valid JSON with fields:
{
  "score": 8,
  "strengths": [],
  "weaknesses": [],
  "suggestions": []
}

Question:
${question}

Answer:
${answer}
`;

    let evaluation;

    try {
      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      const aiText = String(result.text || "").trim();

      if (!aiText) {
        throw new Error("Gemini returned empty content");
      }

      const cleaned = aiText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      evaluation = JSON.parse(cleaned);
    } catch (error) {
      console.log("Evaluation Error / JSON Parse Error");
      console.log(error);
      const aiError = formatAIError(error);
      return res.status(aiError.status).json({ error: aiError.message, code: aiError.code });
    }

    evaluation.score = Number(evaluation.score) || 0;
    evaluation.strengths = Array.isArray(evaluation.strengths) ? evaluation.strengths : [];
    evaluation.weaknesses = Array.isArray(evaluation.weaknesses) ? evaluation.weaknesses : [];
    evaluation.suggestions = Array.isArray(evaluation.suggestions) ? evaluation.suggestions : [];

    res.json(evaluation);
  } catch (error) {
    console.error("SERVER ERROR:", error);
    res.status(500).json({ error: "Failed to evaluate answer" });
  }
});

// =====================
// Final Interview Report Route
// =====================

app.post("/generate-report", async (req, res) => {
  try {
    const { evaluations, questions } = req.body;
    if (!Array.isArray(evaluations) || !Array.isArray(questions)) {
      return res.status(400).json({ error: "Evaluations and questions arrays are required" });
    }

    const prompt = `
You are an expert interview report generator.
Using the provided interview questions and evaluations, summarize performance for technical, project, and HR categories.
Return ONLY valid JSON with fields:
{
  "technicalScore": 0-10,
  "projectScore": 0-10,
  "hrScore": 0-10,
  "overallScore": 0-10,
  "strengths": [],
  "weaknesses": [],
  "recommendation": "..."
}

Questions:
${JSON.stringify(questions, null, 2)}

Evaluations:
${JSON.stringify(evaluations, null, 2)}
`;

    let report;

    try {
      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      const aiText = String(result.text || "").trim();

      if (!aiText) {
        throw new Error("Gemini returned empty content");
      }

      const cleaned = aiText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      report = JSON.parse(cleaned);
    } catch (error) {
      console.log("Report Generation Error / JSON Parse Error");
      console.log(error);

      const aiError = formatAIError(error);
      return res.status(aiError.status).json({ error: aiError.message, code: aiError.code });
    }

    report.technicalScore = Number(report.technicalScore) || 0;
    report.projectScore = Number(report.projectScore) || 0;
    report.hrScore = Number(report.hrScore) || 0;
    report.overallScore = Number(report.overallScore) || 0;
    report.strengths = Array.isArray(report.strengths) ? report.strengths : [];
    report.weaknesses = Array.isArray(report.weaknesses) ? report.weaknesses : [];
    report.recommendation = report.recommendation || "Recommend building stronger examples and refining the overall interview narrative.";

    report.technicalScore = Number(report.technicalScore) || 0;
    report.projectScore = Number(report.projectScore) || 0;
    report.hrScore = Number(report.hrScore) || 0;
    report.overallScore = Number(report.overallScore) || 0;
    report.strengths = Array.isArray(report.strengths) ? report.strengths : [];
    report.weaknesses = Array.isArray(report.weaknesses) ? report.weaknesses : [];
    report.recommendation = report.recommendation || "Recommend building stronger examples and refining the overall interview narrative.";

    res.json(report);
  } catch (error) {
    console.error("SERVER ERROR:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// =====================
// Start Server
// =====================

app.listen(5000, () => {
  console.log("Server running on port 5000");
});