# AI Mock Interviewer

An AI-powered mock interview platform that helps candidates prepare for technical and HR interviews through personalized interview sessions, AI-generated feedback, and downloadable performance reports.

---

## Live Demo

### Frontend Application

https://ai-mock-interviewer-frontend.onrender.com

### Backend API

https://ai-mock-interviewer-szm7.onrender.com

---

## Project Status

**Current Version:** v1.0

### Implemented Features

✅ Resume Upload

✅ Resume Analysis using AI

✅ Candidate Profile Extraction

✅ Personalized Interview Question Generation

✅ Technical Interview Simulation

✅ Project-Based Interview Simulation

✅ HR Interview Simulation

✅ AI Response Evaluation

✅ Detailed Interview Feedback

✅ Performance Scoring

✅ PDF Report Generation

✅ Frontend Deployment

✅ Backend Deployment

---

## Project Overview

AI Mock Interviewer simulates real-world interview experiences by analyzing a candidate's profile and generating relevant interview questions.

The platform evaluates responses, provides detailed feedback, and helps users identify strengths and areas for improvement before actual interviews.

This project aims to make interview preparation more accessible, interactive, and data-driven using Artificial Intelligence.

---

## Features

### AI-Powered Resume Analysis

The system analyzes uploaded resumes and extracts:

* Technical Skills
* Projects
* Experience
* Technologies
* Professional Background

### Personalized Interview Questions

Interview questions are generated dynamically based on the candidate's profile and skill set.

### Multiple Interview Categories

* Technical Round
* Project Discussion Round
* HR Round

### AI Evaluation System

Candidate responses are evaluated using AI based on:

* Technical Accuracy
* Communication Skills
* Problem Solving Ability
* Clarity of Explanation
* Professionalism

### Performance Report

The platform generates a detailed report containing:

* Technical Score
* Project Score
* HR Score
* Overall Score
* Strengths
* Areas of Improvement
* Personalized Feedback

### PDF Report Download

Candidates can download their interview evaluation report for future reference.

---

## How It Works

### Step 1: Upload Resume

The candidate uploads a PDF resume.

### Step 2: Resume Analysis

The AI analyzes the uploaded resume and extracts:

* Skills
* Projects
* Experience
* Technologies

### Step 3: Candidate Profile Generation

A structured candidate profile is created from the extracted resume information.

### Step 4: Interview Question Generation

AI generates personalized interview questions based on the candidate profile.

### Step 5: Mock Interview Session

The candidate answers the generated interview questions.

### Step 6: AI Evaluation

The AI evaluates responses and calculates performance scores.

### Step 7: Report Generation

A detailed interview report is generated.

### Step 8: Download Report

The candidate can download the report as a PDF.

---

## Tech Stack

### Frontend

* React.js
* Vite
* CSS

### Backend

* Node.js
* Express.js

### AI Integration

* Google Gemini API

### Utilities

* PDF Generation
* Multer (File Upload Handling)
* PDF Parsing

### Deployment

* Render (Frontend)
* Render (Backend)
* GitHub

---

## Project Architecture

```text
User
  │
  ▼
Frontend (React + Vite)
  │
  ▼
Backend API (Node.js + Express)
  │
  ▼
Google Gemini API
  │
  ▼
Interview Questions & Evaluation
```

## Project Structure

```text
AI-Mock-INTERVIEWER

├── backend
│   ├── server.js
│   ├── uploads
│   ├── package.json
│   └── .env

├── frontend
│   ├── public
│   ├── src
│   ├── package.json
│   └── vite.config.js

├── tools

├── README.md

└── .gitignore
```

## Installation

### Clone Repository

```bash
git clone https://github.com/Subhamchy9898/AI-Mock-INTERVIEWER.git
```

### Navigate to Project

```bash
cd AI-Mock-INTERVIEWER
```

### Install Backend Dependencies

```bash
cd backend
npm install
```

### Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

## Environment Variables

Create a `.env` file inside the backend directory.

```env
GEMINI_API_KEY=your_gemini_api_key
```

## Run Backend

```bash
cd backend
npm start
```

Backend will run on:

```text
http://localhost:10000
```

## Run Frontend

```bash
cd frontend
npm run dev
```

Frontend will run on:

```text
http://localhost:5173
```

## Deployment

### Frontend Deployment

https://ai-mock-interviewer-frontend.onrender.com

### Backend Deployment

https://ai-mock-interviewer-szm7.onrender.com

### Hosting Platform

Render

---

## Future Enhancements

* Voice-Based Interview System
* Speech-to-Text Integration
* Authentication System
* Candidate Dashboard
* Interview History Tracking
* Industry-Specific Interview Sets
* Analytics Dashboard
* Performance Trends
* Company-Specific Interview Preparation
* AI Career Guidance

---

## Learning Outcomes

This project helped in understanding:

* Full Stack Development
* React Application Architecture
* REST API Development
* AI Integration using Gemini API
* Resume Parsing
* File Upload Handling
* PDF Generation
* State Management
* Deployment Workflow
* Frontend and Backend Hosting
* Production Environment Configuration

---

## Author

### Subham Choudhary

BCA Student | Full Stack Development | AI Enthusiast

GitHub:
https://github.com/Subhamchy9898

---

## License

This project is developed for educational, learning, and portfolio purposes.

© 2026 Subham Choudhary
