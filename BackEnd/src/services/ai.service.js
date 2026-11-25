import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

// Ensure API Key exists
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("❌ Missing GOOGLE_API_KEY in environment variables!");
  throw new Error("Gemini API key not found.");
}

// Initialize Gemini with API Key
const genAI = new GoogleGenerativeAI(apiKey);

// Configure the model
const model = genAI.getGenerativeModel({
  model: "gemini-3.5-flash-lite",
  systemInstruction: `Here’s a solid system instruction for your AI code reviewer:
                        
                           AI System Instruction: Senior Code Reviewer (7+ Years of Experience)
                        
                           Role & Responsibilities:
                        
                           You are an expert code reviewer with 7+ years of development experience. Your role is to analyze, review, and improve code written by developers. You focus on:
                           	•	Code Quality :- Ensuring clean, maintainable, and well-structured code.
                           	•	Best Practices :- Suggesting industry-standard coding practices.
                           	•	Efficiency & Performance :- Identifying areas to optimize execution time and resource usage.
                           	•	Error Detection :- Spotting potential bugs, security risks, and logical flaws.
                           	•	Scalability :- Advising on how to make code adaptable for future growth.
                           	•	Readability & Maintainability :- Ensuring that the code is easy to understand and modify.
                        
                           Guidelines for Review:
                           	1.	Provide Constructive Feedback :- Be detailed yet concise, explaining why changes are needed.
                           	2.	Suggest Code Improvements :- Offer refactored versions or alternative approaches when possible.
                           	3.	Detect & Fix Performance Bottlenecks :- Identify redundant operations or costly computations.
                           	4.	Ensure Security Compliance :- Look for common vulnerabilities (e.g., SQL injection, XSS, CSRF).
                           	5.	Promote Consistency :- Ensure uniform formatting, naming conventions, and style guide adherence.
                           	6.	Follow DRY (Don’t Repeat Yourself) & SOLID Principles :- Reduce code duplication and maintain modular design.
                           	7.	Identify Unnecessary Complexity :- Recommend simplifications when needed.
                           	8.	Verify Test Coverage :- Check if proper unit/integration tests exist and suggest improvements.
                           	9.	Ensure Proper Documentation :- Advise on adding meaningful comments and docstrings.
                           	10.	Encourage Modern Practices :- Suggest the latest frameworks, libraries, or patterns when beneficial.
                        
                           Tone & Approach:
                           	•	Be precise, to the point, and avoid unnecessary fluff.
                           	•	Provide real-world examples when explaining concepts.
                           	•	Assume that the developer is competent but always offer room for improvement.
                           	•	Balance strictness with encouragement :- highlight strengths while pointing out weaknesses.
                        
                           Output Example:
                        
                           ❌ Bad Code:
                           \\\\\\javascript
                                           function fetchData() {
                               let data = fetch('/api/data').then(response => response.json());
                               return data;
                           }
                        
                               \\\\\\
                        
                           🔍 Issues:
                           	•	❌ fetch() is asynchronous, but the function doesn’t handle promises correctly.
                           	•	❌ Missing error handling for failed API calls.
                        
                           ✅ Recommended Fix:
                        
                                   \\\\\\javascript
                           async function fetchData() {
                               try {
                                   const response = await fetch('/api/data');
                                   if (!response.ok) throw new Error("HTTP error! Status: $\\{response.status}");
                                   return await response.json();
                               } catch (error) {
                                   console.error("Failed to fetch data:", error);
                                   return null;
                               }
                           }
                              \\\\\\
                        
                           💡 Improvements:
                           	•	✔ Handles async correctly using async/await.
                           	•	✔ Error handling added to manage failed requests.
                           	•	✔ Returns null instead of breaking execution.
                        
                           Final Note:
                        
                           Your mission is to ensure every piece of code follows high standards. Your reviews should empower developers to write better, more efficient, and scalable code while keeping performance, security, and maintainability in mind.
                        
                           Would you like any adjustments based on your specific needs? 🚀\s`
});

// Generate review content
const SEVERITY_WEIGHTS = {
    Critical: 20,
    Warning: 10,
    Informational: 3,
};

// In-memory chat session store: sessionId -> Gemini chat instance

// Dedicated model for security audits - JSON output mode, isolated from chat model
const securityModel = genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    generationConfig: {
        responseMimeType: "application/json",
    },
    systemInstruction: `You are a security analysis engine. Given source code, identify security vulnerabilities and return ONLY a valid JSON object — no commentary, no markdown, no extra text.

The JSON object must conform to this exact schema:

{
    "score": <integer 0-100 where 100 means no vulnerabilities and 0 means critically dangerous>,
    "summary": "<one sentence describing the overall security posture>",
    "findings": [
        {
            "id": "<unique string, e.g. VULN-001>",
            "severity": "<one of: Critical | Warning | Informational>",
            "type": "<vulnerability category, e.g. SQL Injection | XSS | Hardcoded Credential>",
            "title": "<short title, max 60 chars>",
            "description": "<detailed explanation of the vulnerability and why it is dangerous>",
            "lineStart": <1-based integer line number where the vulnerability starts, or null if not locatable>,
            "lineEnd": <1-based integer line number where the vulnerability ends, or null>,
            "codeSnippet": "<the exact vulnerable code fragment, max 120 chars>",
            "remediation": "<concrete fix or recommendation>"
        }
    ]
}

Severity rules:
- Critical: exploitable remotely, data loss/exfiltration risk, authentication bypass, code execution
- Warning: bad practice that could become exploitable, missing validation, insecure defaults
- Informational: code smells, overly permissive settings, hardcoded non-secret values

Score formula: start at 100, subtract 20 per Critical, 10 per Warning, 3 per Informational. Minimum 0.
If no vulnerabilities are found, return findings: [] and score: 100.
Always return exactly one top-level JSON object matching this schema.`,
});

function normalizeFinding(finding, index) {
    const validSeverities = Object.keys(SEVERITY_WEIGHTS);
    const severity = validSeverities.includes(finding?.severity)
        ? finding.severity
        : "Informational";

    return {
        id: finding?.id || `VULN-${String(index + 1).padStart(3, "0")}`,
        severity,
        type: finding?.type || "General",
        title: String(finding?.title || "Potential security issue").slice(0, 60),
        description: finding?.description || "",
        lineStart:
            typeof finding?.lineStart === "number" ? finding.lineStart : null,
        lineEnd: typeof finding?.lineEnd === "number" ? finding.lineEnd : null,
        codeSnippet: finding?.codeSnippet
            ? String(finding.codeSnippet).slice(0, 120)
            : "",
        remediation: finding?.remediation || "",
    };
}

// Stateless security audit — returns { score, summary, findings }
export async function runSecurityAudit(code) {
    try {
        if (typeof code !== "string" || !code.trim()) {
            throw new Error("Code is required.");
        }

        const prompt = `Analyze the following code for security vulnerabilities:\n\n${code}`;
        const result = await securityModel.generateContent(prompt);

        if (!result?.response) {
            throw new Error("Empty response from Gemini API.");
        }

        const raw = result.response.text();
        const parsed = JSON.parse(raw);

        if (!Array.isArray(parsed.findings) || typeof parsed.score !== "number") {
            throw new Error("Malformed security audit response schema.");
        }

        const clampedScore = Math.max(0, Math.min(100, Math.round(parsed.score)));
        const findings = parsed.findings.map(normalizeFinding);

        return {
            score: clampedScore,
            summary:
                typeof parsed.summary === "string" && parsed.summary.trim()
                    ? parsed.summary.trim()
                    : "Security audit completed.",
            findings,
        };
    } catch (error) {
        console.error("Error in security audit:", error.message);
        throw error;
    }
}
const chatSessions= new Map()

function getOrCreateChatSession(sessionId){
  if(!chatSessions.has(sessionId)){
    const chat= model.startChat({history:[]});
    chatSessions.set(sessionId, chat);
  }

  return chatSessions.get(sessionId);
}

export async function sendChatMessages(sessionId,message) {
  try{
    if(!message){
      throw new Error("Message required:");
    }
    const chat=getOrCreateChatSession(sessionId);
    const result = await chat.sendMessage(message);

    if(!result?.response){
      throw new Error("Empty response from gemini");
    }

    return result.response.text();
}catch(error){
  console.error("error in chat message",error.message);
  return "failed to proceed message. please try again later.";
}
}


export default async function generateContent(prompt, history=[]) {
  try {
    if (!prompt) throw new Error("Prompt is required for code review.");

    const result = await model.generateContent(prompt);

    // Handle missing or empty responses
    if (!result?.response) {
      throw new Error("Empty response from Gemini API.");
    }

    return result.response.text();
  } catch (error) {
    console.error("❌ Error generating content:", error.message);
    return "⚠️ Failed to generate code review. Please try again later.";
  }
}
