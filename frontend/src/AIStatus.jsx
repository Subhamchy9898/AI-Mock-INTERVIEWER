import React, { useContext } from "react";
import { AIStatusContext } from "./aiStatusContext";

export default function AIStatus() {
  const { aiStatus } = useContext(AIStatusContext);
  if (!aiStatus || aiStatus === "idle") return null;

  const text = aiStatus === "available" ? "🟢 Available" : aiStatus === "checking" ? "⏳ Checking" : "🔴 Unavailable";
  const desc = aiStatus === "available" ? "AI evaluation is available." : aiStatus === "checking" ? "Checking AI services..." : "AI services are temporarily unavailable.";

  return (
    <div className="status-pill">
      <span className="status-pill-label">AI Status:</span>
      <strong>{text}</strong>
      <p>{desc}</p>
    </div>
  );
}
