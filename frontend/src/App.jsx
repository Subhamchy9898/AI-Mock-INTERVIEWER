import { useEffect, useState, useContext, useRef } from "react";
import { jsPDF } from "jspdf";
import "./App.css";
import AIStatus from "./AIStatus";
import { AIStatusContext } from "./aiStatusContext";

const DEFAULT_FALLBACK_QUESTIONS = [
  { type: "Technical", question: "Explain Object Oriented Programming." },
  { type: "Technical", question: "What is the difference between Array and Linked List?" },
  { type: "Technical", question: "Explain SQL Joins." },
  { type: "Project", question: "Explain one of your major projects." },
  { type: "Project", question: "What challenges did you face during project development?" },
  { type: "HR", question: "Tell me about yourself." },
  { type: "HR", question: "Why should we hire you?" },
];

function App() {
  const [stage, setStage] = useState("upload");
  const [resume, setResume] = useState(null);
  const [profile, setProfile] = useState({
    skills: [],
    projects: [],
    experience: [],
    education: [],
    certifications: [],
  });
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [evaluations, setEvaluations] = useState([]);
  const [finalReport, setFinalReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [error, setError] = useState("");
  const { aiStatus, setAiStatus } = useContext(AIStatusContext);
  const [submitted, setSubmitted] = useState({}); // map questionIndex -> boolean
  const recognitionRef = useRef(null);
  const speechTimeoutRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechCaptured, setSpeechCaptured] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState("");

  const clearSpeechTimeout = () => {
    if (speechTimeoutRef.current) {
      window.clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
  };

  const stopRecognition = () => {
    clearSpeechTimeout();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("Failed to stop recognition", e);
      }
      recognitionRef.current = null;
    }
  };

  const resetVoiceState = () => {
    stopRecognition();
    clearSpeechTimeout();
    setIsRecording(false);
    setIsProcessing(false);
    setSpeechCaptured(false);
    setRecordingSeconds(0);
    setInterimTranscript("");
  };

  const resumeFilename =
    resume?.name ||
    resume?.filename ||
    resume?.file?.name ||
    resume?.document?.name ||
    resume?.metadata?.name ||
    "";

  // Derived UI strings for AI status (used in header/status pill)
  // Standardize AI status values: idle | checking | available | unavailable
  const aiStatusText = aiStatus === "available" ? "🟢 Available" : aiStatus === "checking" ? "⏳ Checking" : aiStatus === "idle" ? "" : "🔴 Unavailable";
  const aiStatusDescription = aiStatus === "available" ? "AI evaluation is available." : aiStatus === "checking" ? "Checking AI services..." : aiStatus === "idle" ? "" : "AI services are temporarily unavailable.";


  const resetState = () => {
    setProfile({
      skills: [],
      projects: [],
      experience: [],
      education: [],
      certifications: [],
    });
    setQuestions([]);
    setCurrentQuestion(0);
    setAnswers({});
    setEvaluations([]);
    setFinalReport(null);
    setSubmitted({});
    setAiStatus("idle");
    setFallbackMode(false);
    setError("");
    resetVoiceState();
    localStorage.removeItem("ai-mock-interviewer-answers");
  };

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return;
    }

    const steps = [
      "Resume Analysis in Progress",
      "Extracting Skills...",
      "Building Candidate Profile...",
      "Generating Interview Questions...",
    ];

    const interval = setInterval(() => {
      setLoadingStep((current) => (current + 1) % steps.length);
    }, 1100);

    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (fallbackMode) {
      localStorage.setItem("ai-mock-interviewer-answers", JSON.stringify(answers));
    }
  }, [answers, fallbackMode]);

  // Debug: log resume object when selected to ensure name exists
  useEffect(() => {
    if (resume) {
      // Log shallow info to avoid large File object serialization issues
      try {
        console.log("[DEBUG] Selected resume object:", {
          name: resume.name,
          size: resume.size,
          type: resume.type,
          lastModified: resume.lastModified,
        });
      } catch (e) {
        console.log("[DEBUG] Selected resume (could not serialize):", resume);
      }
      // Additional explicit logs requested for debugging filename visibility
      try {
        console.log("selectedFile", resume);
        console.log("selectedFile.name", resume?.name);
      } catch (e) {
        console.log("selectedFile logging failed", e);
      }
    } else {
      console.log("[DEBUG] No resume selected");
      console.log("selectedFile", null);
      console.log("selectedFile.name", undefined);
    }
  }, [resume]);

  const handleUpload = async () => {
    if (!resume) {
      alert("Please select a resume");
      return;
    }

    const formData = new FormData();
    formData.append("resume", resume);
    setLoading(true);
    setError("");
    setAiStatus("checking");

    try {
      const response = await fetch("http://localhost:5000/upload-resume", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (import.meta.env && import.meta.env.DEV) {
        console.log("Received profile from AI:", data);
      }

      if (!response.ok) {
        const aiFailure = ["AI_SERVICE_UNAVAILABLE", "AI_PARSE_FAILED"].includes(data.code);
        if (aiFailure || response.status === 429) {
          setAiStatus("unavailable");
          setFallbackMode(false);
          setError("");
          return;
        }

        throw new Error(data.error || "Unable to process resume");
      }

      resetState();
      setAiStatus("available");
      setProfile({
        skills: data.skills || [],
        projects: data.projects || [],
        experience: data.experience || [],
        education: data.education || [],
        certifications: data.certifications || [],
      });
      setQuestions(data.questions || []);
      setCurrentQuestion(0);
      setStage("profile");
    } catch (uploadError) {
      console.error(uploadError);
      setError(uploadError.message || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateAnswer = (value) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion]: value }));
    setSubmitted((prev) => ({ ...prev, [currentQuestion]: false }));
  };

  const formatRecordingTime = (seconds) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const startRecording = () => {
    if (isRecording) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.baseText = answers[currentQuestion] || "";

      recognition.onstart = () => {
        setIsRecording(true);
        setIsProcessing(false);
        setSpeechCaptured(false);
        setRecordingSeconds(0);
        setInterimTranscript("");
      };

      recognition.onresult = (event) => {
        let final = "";
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) final += res[0].transcript;
          else interim += res[0].transcript;
        }

        const base = recognition.baseText || "";
        const combined = base + final + interim;
        setAnswers((prev) => ({ ...prev, [currentQuestion]: combined }));
        setInterimTranscript(interim);

        if (final) {
          recognition.baseText = base + final;
        }
      };

      recognition.onerror = (e) => {
        console.error("Speech recognition error", e);
        if (e.error === "not-allowed" || e.error === "permission-denied") {
          alert("Microphone permission denied. Please allow microphone access in your browser settings.");
        }
        setIsRecording(false);
        setIsProcessing(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setIsProcessing(true);
        setInterimTranscript("");
        clearSpeechTimeout();
        speechTimeoutRef.current = window.setTimeout(() => {
          speechTimeoutRef.current = null;
          setIsProcessing(false);
          if ((answers[currentQuestion] || "").trim().length > 0) {
            setSpeechCaptured(true);
          } else {
            setSpeechCaptured(false);
          }
        }, 800);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error("Failed to start speech recognition", err);
      alert("Could not start speech recognition.");
      setIsProcessing(false);
    }
  };

  const stopRecording = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    } catch (e) {
      console.warn(e);
    }
    clearSpeechTimeout();
    setIsRecording(false);
    setIsProcessing(true);
    setInterimTranscript("");
    speechTimeoutRef.current = window.setTimeout(() => {
      speechTimeoutRef.current = null;
      setIsProcessing(false);
      if ((answers[currentQuestion] || "").trim().length > 0) {
        setSpeechCaptured(true);
      } else {
        setSpeechCaptured(false);
      }
    }, 800);
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }
      clearSpeechTimeout();
    };
  }, [currentQuestion]);

  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return;
    }

    const timer = window.setInterval(() => {
      setRecordingSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  const continueWithFallback = () => {
    resetState();
    setAiStatus("unavailable");
    setFallbackMode(true);
    setQuestions(DEFAULT_FALLBACK_QUESTIONS);
    setStage("profile");
    const saved = localStorage.getItem("ai-mock-interviewer-answers");
    if (saved) {
      try {
        setAnswers(JSON.parse(saved));
      } catch {
        localStorage.removeItem("ai-mock-interviewer-answers");
      }
    }
  };

  const handleRetryLater = () => {
    setAiStatus("idle");
    setError("");
  };

  const submitAnswer = async () => {
    const current = questions[currentQuestion];
    const answerText = (answers[currentQuestion] || "").trim();

    if (!current || !answerText) {
      alert("Please write your answer before submitting.");
      return;
    }

    if (fallbackMode || aiStatus === "unavailable") {
      setEvaluations((prev) => {
        const next = [...prev];
        next[currentQuestion] = {
          score: null,
          strengths: [],
          weaknesses: [],
          suggestions: [],
        };
        return next;
      });
      setSubmitted((prev) => ({ ...prev, [currentQuestion]: true }));
      localStorage.setItem("ai-mock-interviewer-answers", JSON.stringify({ ...answers, [currentQuestion]: answerText }));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5000/evaluate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: current.question, answer: answerText }),
      });
      const data = await response.json();

      if (!response.ok) {
        const aiFailure = ["AI_SERVICE_UNAVAILABLE", "AI_PARSE_FAILED"].includes(data.code);
        if (aiFailure) {
          setAiStatus("unavailable");
          setError("");
          return;
        }
        throw new Error(data.error || "Evaluation failed");
      }

      setEvaluations((prev) => {
        const next = [...prev];
        next[currentQuestion] = data;
        return next;
      });
      setSubmitted((prev) => ({ ...prev, [currentQuestion]: true }));
    } catch (evaluationError) {
      console.error(evaluationError);
      setError(evaluationError.message || "Could not evaluate answer.");
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    const unanswered = questions.some((_, index) => !evaluations[index]);
    if (unanswered) {
      alert("Please submit answers for all questions before generating the report.");
      return;
    }

    if (fallbackMode || aiStatus === "unavailable") {
      setFinalReport({
        technicalScore: null,
        projectScore: null,
        hrScore: null,
        overallScore: null,
        strengths: [],
        weaknesses: [],
        recommendation: "Evaluation unavailable because AI service could not process responses at this time.",
        technicalSummary: null,
        projectSummary: null,
        communicationSummary: null,
        hrSummary: null,
      });
      setStage("report");
      return;
    }

    setReportLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5000/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluations, questions }),
      });
      const data = await response.json();

      if (!response.ok) {
        const aiFailure = ["AI_SERVICE_UNAVAILABLE", "AI_PARSE_FAILED"].includes(data.code);
        if (aiFailure) {
          setAiStatus("unavailable");
          setError("");
          return;
        }
        throw new Error(data.error || "Report generation failed");
      }

      setFinalReport(data);
      setStage("report");
    } catch (reportError) {
      console.error(reportError);
      setError(reportError.message || "Unable to generate final report.");
    } finally {
      setReportLoading(false);
    }
  };

  const downloadReportPdf = () => {
    if (!finalReport) return;

    const now = new Date();
    const formattedDate = now.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const possibleNames = [
      finalReport && (finalReport.candidateName || finalReport.name),
      finalReport && finalReport.candidate && (finalReport.candidate.name || finalReport.candidate.fullName),
      profile && (profile.name || profile.fullName || profile.candidateName),
    ];
    
    // Clean up file formatting text artifacts to look cleaner on assessment headers
    const sanitizeName = (n) => {
      if (typeof n !== "string" || !n.trim() || /\.pdf$/i.test(n)) return null;
      return n.replace(/[-_](cv|resume)/i, "")
              .replace(/\(\d+\)/g, "")
              .trim();
    };

    let candidateName = "Unknown";
    for (const n of possibleNames) {
      const s = sanitizeName(n);
      if (s && /[a-zA-Z]/.test(s) && s.length > 1) {
        candidateName = s;
        break;
      }
    }

    // FIXED: Convert single-digit scores out of 10 to proper percentage scales out of 100
    const parseScoreToPercentage = (value) => {
      if (value === null || value === undefined) return null;
      const num = Number(value);
      if (!Number.isFinite(num)) return null;
      return num <= 10 ? num * 10 : num;
    };

    const technicalScore = parseScoreToPercentage(finalReport.technicalScore);
    const projectScore = parseScoreToPercentage(finalReport.projectScore);
    const hrScore = parseScoreToPercentage(finalReport.hrScore);
    const overallScore = parseScoreToPercentage(finalReport.overallScore) ?? 
      (technicalScore !== null && projectScore !== null && hrScore !== null ? Math.round((technicalScore + projectScore + hrScore) / 3) : null);

    const strengths = Array.isArray(finalReport.strengths) && finalReport.strengths.length ? finalReport.strengths : ["No significant data recorded."];
    const weaknesses = Array.isArray(finalReport.weaknesses) && finalReport.weaknesses.length ? finalReport.weaknesses : ["No significant issues observed."];
    const recommendation = finalReport.recommendation || "No recommendation available.";

    const getStatus = (score) => {
      if (score >= 85) return "Strong Hire";
      if (score >= 70) return "Hire";
      if (score >= 50) return "Borderline";
      return "Needs Improvement";
    };

    // Initialize document (A4 size: 595 x 842 pt)
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = 595;
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;
    let yOffset = 0;

    // 1. Blue Header Banner
    doc.setFillColor("#2563eb");
    doc.rect(0, 0, pageWidth, 75, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor("#ffffff");
    doc.text("Recruiter Assessment Sheet", margin, 34);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor("#dbeafe");
    doc.text("AI-Assisted Mock Interview Evaluation Summary", margin, 52);
    
    // 2. Metadata Section (Compact row)
    yOffset = 100;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor("#475569");
    doc.text("CANDIDATE NAME:", margin, yOffset);
    doc.setFont("helvetica", "normal");
    doc.setTextColor("#0f172a");
    doc.text(String(candidateName), margin + 105, yOffset);

    doc.setFont("helvetica", "bold");
    doc.setTextColor("#475569");
    doc.text("GENERATED DATE:", margin + 300, yOffset);
    doc.setFont("helvetica", "normal");
    doc.setTextColor("#0f172a");
    doc.text(String(formattedDate), margin + 405, yOffset);

    // Subtle divider line
    yOffset += 15;
    doc.setDrawColor("#e2e8f0");
    doc.setLineWidth(1);
    doc.line(margin, yOffset, margin + contentWidth, yOffset);

    // 3. Scores Layout Matrix
    yOffset += 25;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor("#2563eb");
    doc.text("PERFORMANCE SCORECARD", margin, yOffset);

    yOffset += 12;
    const scoreItems = [
      { label: "Technical Score", val: technicalScore },
      { label: "Project Score", val: projectScore },
      { label: "HR Score", val: hrScore },
      { label: "Overall Score", val: overallScore },
    ];

    const boxWidth = contentWidth / 4;
    scoreItems.forEach((item, idx) => {
      const currentX = margin + idx * boxWidth;
      const cardActualWidth = boxWidth - 8;
      
      doc.setDrawColor("#e2e8f0");
      doc.setFillColor("#f8fafc");
      doc.rect(currentX, yOffset, cardActualWidth, 45, "F");
      doc.rect(currentX, yOffset, cardActualWidth, 45, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor("#64748b");
      doc.text(item.label.toUpperCase(), currentX + 10, yOffset + 16);

      doc.setFontSize(14);
      doc.setTextColor("#0f172a");
      const textVal = item.val !== null ? `${item.val}%` : "N/A";
      doc.text(textVal, currentX + 10, yOffset + 36);

      if (item.label === "Overall Score" && item.val !== null) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(item.val >= 70 ? "#16a34a" : "#d97706");
        doc.text(getStatus(item.val).toUpperCase(), currentX + cardActualWidth - 10, yOffset + 36, { align: "right" });
      }
    });

    // 4. Balanced Two-Column Structure for Strengths & Weaknesses
    yOffset += 75;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor("#2563eb");
    doc.text("KEY INTERVIEW OBSERVATIONS", margin, yOffset);

    yOffset += 15;
    const colWidth = (contentWidth - 20) / 2;
    const startY = yOffset;

    // Render Strengths Column
    doc.setFontSize(9.5);
    doc.setTextColor("#1e293b");
    doc.text("Strengths & Proficiencies", margin, yOffset);
    yOffset += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor("#334155");
    
    strengths.forEach((str) => {
      const bulletLine = `• ${typeof str === "string" ? str : JSON.stringify(str)}`;
      const wrappedLines = doc.splitTextToSize(bulletLine, colWidth);
      wrappedLines.forEach((line) => {
        if (yOffset < 780) {
          doc.text(line, margin, yOffset);
          yOffset += 13;
        }
      });
    });

    const strengthsEndY = yOffset;

    // Reset offsets to trace side-by-side matching col path
    yOffset = startY;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor("#1e293b");
    doc.text("Areas for Improvement", margin + colWidth + 20, yOffset);
    yOffset += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor("#334155");

    weaknesses.forEach((weak) => {
      const bulletLine = `• ${typeof weak === "string" ? weak : JSON.stringify(weak)}`;
      const wrappedLines = doc.splitTextToSize(bulletLine, colWidth);
      wrappedLines.forEach((line) => {
        if (yOffset < 780) {
          doc.text(line, margin + colWidth + 20, yOffset);
          yOffset += 13;
        }
      });
    });

    yOffset = Math.max(strengthsEndY, yOffset) + 20;

    // 5. Final Recommendation Section Card Box (Dynamic Height Auto-scaling)
    if (yOffset < 780) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor("#2563eb");
      doc.text("FINAL RECOMMENDATION", margin, yOffset);

      yOffset += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor("#0f172a");

      const wrappedRecommendation = doc.splitTextToSize(String(recommendation), contentWidth - 16);
      const cardBoxHeight = (wrappedRecommendation.length * 13) + 14;

      doc.setDrawColor("#e2e8f0");
      doc.setFillColor("#f8fafc");
      doc.rect(margin, yOffset, contentWidth, cardBoxHeight, "F");
      doc.rect(margin, yOffset, contentWidth, cardBoxHeight, "S");

      let textPrintY = yOffset + 14;
      wrappedRecommendation.forEach((line) => {
        if (textPrintY < 810) {
          doc.text(line, margin + 10, textPrintY);
          textPrintY += 13;
        }
      });
    }

    // 6. Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor("#94a3b8");
    const footerLine = "Generated by AI Mock Interviewer Hub | Internal Recruiter Assessment Report Sheet.";
    doc.text(footerLine, margin, 825);

    doc.save("ai-mock-interview-assessment-report.pdf");
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      resetVoiceState();
      setCurrentQuestion((count) => count + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      resetVoiceState();
      setCurrentQuestion((count) => count - 1);
    }
  };

  const renderListItem = (item) => {
    if (item == null) return "";
    if (typeof item === "string") return item;
    if (Array.isArray(item)) return item.map((it) => renderListItem(it)).join(", ");
    if (typeof item === "object") {
      const title = item.name || item.title || item.project || item.label || "Untitled";
      const desc = item.description || item.summary || item.role || null;
      const techs = Array.isArray(item.technologies) ? item.technologies.join(", ") : item.technologies || null;
      const org = item.company || item.institution || null;
      const dateRange = item.dates || (item.from || item.start ? `${item.from || item.start} - ${item.to || item.end || "present"}` : null);

      return (
        <div className="profile-list-item">
          <div className="item-title">{title}</div>
          {desc && <div className="item-desc">{desc}</div>}
          {(techs || org || dateRange) && (
            <div className="item-meta">{[techs, org, dateRange].filter(Boolean).join(" • ")}</div>
          )}
        </div>
      );
    }

    try {
      return String(item);
    } catch (e) {
      return "";
    }
  };

  const renderBulletList = (items, fallbackText = "No items found.") => {
    if (!Array.isArray(items) || items.length === 0) {
      return <div className="empty-state">{fallbackText}</div>;
    }

    return (
      <ul>
        {items.map((item, index) => (
          <li key={index}>{renderListItem(item)}</li>
        ))}
      </ul>
    );
  };

  const renderProfileCard = (title, items, icon, fallbackText) => {
    const count = Array.isArray(items) ? items.length : 0;
    return (
      <div className="profile-card">
        <div className="card-title">
          <span className="icon">{icon}</span>
          <div>
            <h3>{title}</h3>
            <div className="item-count">{count} item{count === 1 ? "" : "s"}</div>
          </div>
        </div>
        {renderBulletList(items, fallbackText)}
      </div>
    );
  };

  return (
    <div className="container">
      <div className="hero">
        <div className="hero-copy">
          <div className="hero-eyebrow">Interview readiness</div>
          <h1 className="hero-title">Launch your mock interview with confidence.</h1>
          <p className="hero-subtitle">
            Prepare for interviews with personalized questions, intelligent feedback, and professional performance insights.
          </p>
        </div>

        <div className="upload-card">
          <h2>Upload your resume</h2>
          <p className="upload-subtitle">Choose a PDF resume to generate a candidate profile and an interview session tailored to your background.</p>

          <input
            id="resume-upload"
            type="file"
            accept=".pdf"
            onChange={(e) => {
              const f = e.target.files && e.target.files[0];
              console.log("[DEBUG] file input change, file:", f);
              console.log("selectedFile", f);
              console.log("selectedFile.name", f?.name);
              if (f) setResume(f);
            }}
            className="hidden-file-input"
          />

          <label
            className="upload-picker"
            htmlFor="resume-upload"
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; e.currentTarget.classList.add('drag-over'); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove('drag-over'); }}
            onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); const f = e.dataTransfer.files && e.dataTransfer.files[0]; console.log("[DEBUG] drop file:", f); console.log("selectedFile", f); console.log("selectedFile.name", f?.name); if (f) setResume(f); }}
          >
            <div className="upload-picker-icon">📄</div>
            <div>
              <div className="upload-picker-title">Select a PDF resume</div>
              <div className="upload-picker-description">Click to browse files or drag and drop a resume.</div>
            </div>
          </label>

          <div className="upload-file-area">
            {resume ? (
              <div className="upload-file-details">
                <div className="file-info">
                  <div className="file-meta">
                    <span className="file-icon">📄</span>
                    <span className="file-name">{resumeFilename}</span>
                  </div>
                  <button className="remove-btn secondary" onClick={() => setResume(null)}>Remove</button>
                </div>
              </div>
            ) : (
              <div className="upload-file-placeholder">No file selected</div>
            )}

            <div className="upload-actions">
              <button onClick={handleUpload} disabled={loading || !resume}>
                {loading ? "Analyzing resume..." : "Upload Resume"}
              </button>
            </div>
          </div>

          <p className="upload-help">
            Receive a personalized candidate profile, targeted interview questions, answer evaluation, and a professional performance report.
          </p>
        </div>
      </div>

      {stage !== "upload" && <AIStatus />}

      {aiStatus === "unavailable" && !fallbackMode && (
        <div className="ai-alert-card">
          <strong>AI Evaluation Currently Unavailable</strong>
          <p>
            The AI service is temporarily unavailable. You can still practice interview questions, but answer evaluation and report generation require AI services.
          </p>
          <div className="buttons">
            <button className="secondary" onClick={() => { setAiStatus("idle"); setError(""); }}>
              Retry Later
            </button>
            <button onClick={continueWithFallback}>
              Start Practice Mode
            </button>
          </div>
        </div>
      )}

      {loading && aiStatus !== "unavailable" && (
        <div className="loading-card">
          <div className="spinner" />
          <div className="loading-content">
            <h3>Resume Analysis in Progress</h3>
            <p>
              {[
                "Resume Analysis in Progress",
                "Extracting Skills...",
                "Building Candidate Profile...",
                "Generating Interview Questions...",
              ][loadingStep]}
            </p>
            <div className="loading-progress-bar">
              <div className="loading-progress-fill" style={{ width: `${((loadingStep + 1) / 4) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      {stage === "profile" && (
        <div className="dashboard">
          <div className="section-header">
            <div>
              <h2>Candidate Profile</h2>
              <p>Review the extracted profile before starting the mock interview.</p>
            </div>
            <button
              className="start-interview-btn"
              onClick={() => {
                resetVoiceState();
                setCurrentQuestion(0);
                setStage("questions");
              }}
            >
              Start Interview
            </button>
          </div>
          {((fallbackMode || aiStatus === "unavailable") ? (
            <div className="profile-empty">
              <h3>Resume Analysis Unavailable</h3>
              <p>Profile information could not be extracted because AI services are currently unavailable.</p>
            </div>
          ) : (
            <div className="profile-grid">
              {renderProfileCard("Skills", profile.skills, "⚡", "No skills found")}
              {renderProfileCard("Projects", profile.projects, "📁", "No projects found")}
              {renderProfileCard("Experience", profile.experience, "💼", "No experience found")}
              {renderProfileCard("Education", profile.education, "🎓", "No education found")}
              {renderProfileCard("Certifications", profile.certifications, "🛡️", "No certifications found")}
            </div>
          ))}

          <div className="profile-summary">
            <h3>Interview Questions Ready</h3>
            <p>{questions.length} questions were prepared{fallbackMode ? " using fallback defaults." : " based on your resume."}</p>
          </div>
        </div>
      )}

      {stage === "questions" && (
        <div className="interview-box">
          <div className="section-header question-header">
            <div>
              <h2>Interview Questions</h2>
              <p>{fallbackMode ? "Practice mode is active. Answers are saved locally and no AI scoring will be provided." : "Answer each question and submit to receive AI feedback."}</p>
            </div>
            <button className="secondary" onClick={() => setStage("profile")}>Back to Profile</button>
          </div>

          <div className="question-meta">
            <span className="badge">{questions[currentQuestion]?.type || "Question"}</span>
            <span>Question {currentQuestion + 1} / {questions.length}</span>
          </div>

          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}></div>
          </div>

          <div className="question-card">
            <h3>{questions[currentQuestion]?.question}</h3>

            <div className="answer-area">
              <textarea
                value={answers[currentQuestion] || ""}
                onChange={(e) => updateAnswer(e.target.value)}
                placeholder="Write your answer here..."
                aria-label="Answer textarea"
              />

              <div className="mic-control-row">
                <div className="mic-status" aria-live="polite">
                  {isRecording ? (
                    <>
                      <span className="status-dot"></span>
                      <span>Listening...</span>
                      <span className="status-time">{formatRecordingTime(recordingSeconds)}</span>
                    </>
                  ) : isProcessing ? (
                    <>
                      <span className="mic-spinner" aria-hidden="true"></span>
                      <span>Converting speech...</span>
                    </>
                  ) : speechCaptured ? (
                    <>
                      <span className="status-check">✓</span>
                      <span>Speech captured</span>
                    </>
                  ) : (
                    <>
                      <span className="status-mic">🎤</span>
                      <span>Voice input available</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  className={`mic-action-btn ${isRecording ? "recording" : ""}`}
                  onClick={() => (isRecording ? stopRecording() : startRecording())}
                  aria-pressed={isRecording}
                  title={isRecording ? "Stop recording" : "Start voice input"}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path fill="none" d="M0 0h24v24H0z" />
                    <path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2zm-5 8a1 1 0 0 0 1-1v-1h-2v1a1 1 0 0 0 1 1zm-3-1a5 5 0 0 0 10 0h-2a3 3 0 0 1-6 0H9z" />
                  </svg>
                  <span>{isRecording ? "Stop" : "Use voice"}</span>
                </button>
              </div>
            </div>

            {interimTranscript && (
              <div className="interim-transcript">{interimTranscript}</div>
            )}

            <button onClick={submitAnswer} disabled={loading || submitted[currentQuestion]}>
              {submitted[currentQuestion] ? "✓ Submitted" : loading ? "Submitting Answer..." : "Submit Answer"}
            </button>
            {submitted[currentQuestion] && <div className="submitted-note">Answer Saved Successfully</div>}
          </div>

          {evaluations[currentQuestion] && (
            <div className="evaluation-card">
              <h4>Evaluation</h4>
              {evaluations[currentQuestion].score === null ? (
                <p className="unavailable-note">
                  AI evaluation is unavailable for this response. Your answer has been stored locally for practice.
                </p>
              ) : (
                <>
                  <div className="evaluation-score">Score: {evaluations[currentQuestion].score}/10</div>
                  <div>
                    <strong>Strengths</strong>
                    {renderBulletList(evaluations[currentQuestion].strengths)}
                  </div>
                  <div>
                    <strong>Weaknesses</strong>
                    {renderBulletList(evaluations[currentQuestion].weaknesses)}
                  </div>
                  <div>
                    <strong>Suggestions</strong>
                    {renderBulletList(evaluations[currentQuestion].suggestions)}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="buttons">
            <button className="secondary" onClick={previousQuestion} disabled={currentQuestion === 0}>
              Previous
            </button>
            <button className="secondary" onClick={nextQuestion} disabled={currentQuestion === questions.length - 1}>
              Next
            </button>
          </div>

          <div className="footer-actions">
            <button onClick={generateReport} disabled={reportLoading}>
              {reportLoading ? "Generating Report..." : "Finish Interview"}
            </button>
          </div>
        </div>
      )}

      {stage === "report" && finalReport && (
        <div className="report-page">
          <div className="section-header">
            <div>
              <h2>{finalReport.overallScore === null ? "Practice Session Summary" : "Final Interview Report"}</h2>
              <p>{finalReport.overallScore === null ? "AI Evaluation Unavailable" : "Review the candidate performance summary and download your PDF report."}</p>
            </div>
            <button
              onClick={downloadReportPdf}
              disabled={aiStatus !== "available" || finalReport.overallScore === null}
              title={aiStatus !== "available" || finalReport.overallScore === null ? "AI evaluation is required before generating a report." : "Download PDF report"}
            >
              {aiStatus !== "available" || finalReport.overallScore === null ? "PDF Report Unavailable" : "Download PDF"}
            </button>
          </div>
          {finalReport.overallScore === null ? (
            <div className="report-empty">
              <h3>AI Evaluation Not Available</h3>
              <p>This interview was completed in Practice Mode. Scores, recommendations, and detailed feedback require AI evaluation.</p>
            </div>
          ) : (
            <>
              <div className="report-grid">
                <div className="report-card">
                  <h3>Technical</h3>
                  <p>{finalReport.technicalScore === null ? "Unavailable" : `${finalReport.technicalScore}/10`}</p>
                </div>
                <div className="report-card">
                  <h3>Project</h3>
                  <p>{finalReport.projectScore === null ? "Unavailable" : `${finalReport.projectScore}/10`}</p>
                </div>
                <div className="report-card">
                  <h3>HR</h3>
                  <p>{finalReport.hrScore === null ? "Unavailable" : `${finalReport.hrScore}/10`}</p>
                </div>
                <div className="report-card overall-card">
                  <h3>Overall</h3>
                  <p>{finalReport.overallScore === null ? "Unavailable" : `${finalReport.overallScore}/10`}</p>
                </div>
              </div>

              <div className="report-summary">
                <div>
                  <h3>Strengths</h3>
                  {renderBulletList(finalReport.strengths)}
                </div>
                <div>
                  <h3>Weaknesses</h3>
                  {renderBulletList(finalReport.weaknesses)}
                </div>
              </div>

              <div className="recommendation-card">
                <h3>Recommendation</h3>
                <p>{finalReport.recommendation}</p>
              </div>
            </>
          )}

          <div className="footer-actions">
            <button
              onClick={() => {
                resetState();
                setStage("upload");
              }}
            >
              Analyze a New Resume
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;