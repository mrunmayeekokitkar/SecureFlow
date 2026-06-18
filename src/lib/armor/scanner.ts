import Groq from 'groq-sdk';

export type ScanFinding = {
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  description: string;
  fileLocation: string;
  codeSnippet: string;
};

export interface FileChange {
  filename: string;
  patch: string;
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export class ArmorIQScanner {
  async scanPullRequest(files: FileChange[]): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = [];

    for (const file of files) {
      const prompt = `Analyze the following code changes (git patch) for security vulnerabilities.
Look for:
1. Hardcoded secrets (actual string values like "sk-...").
2. Contextual leaks (explicitly logging variables to the console or exposing them to clients).
3. Logic flaws.

File: ${file.filename}
Patch:
${file.patch}

Respond ONLY in strictly valid JSON containing an array of findings. If no vulnerabilities exist, return an empty array [].
Format:
[{
  "type": "Data Leak | Vulnerability | Misconfig",
  "severity": "CRITICAL | HIGH | MEDIUM | LOW",
  "description": "Detailed explanation.",
  "fileLocation": "${file.filename}",
  "codeSnippet": "The specific problematic line(s) of code"
}]`;

      try {
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are an elite application security auditor. Output raw JSON only.
              
CRITICAL RULES:
1. ONLY flag actual, executable vulnerabilities in the code structure.
2. IGNORE theoretical or infrastructure-level risks (e.g., do not flag environment variables just because a server "could" be compromised).
3. IGNORE any code found inside strings, comments, or template literals. Do not scan text that is meant to be a prompt or instruction.
4. Reading from "process.env" or importing "dotenv" is strictly SAFE and expected backend behavior. NEVER flag this.` 
            },
            { role: 'user', content: prompt }
          ],
          model: 'llama-3.3-70b-versatile',
          response_format: { type: 'json_object' },
        });

        const responseText = chatCompletion.choices[0]?.message?.content || '{"findings": []}';
        // Depending on how Groq formats the JSON object, you might need to extract an array
        const result = JSON.parse(responseText);
        const fileFindings = Array.isArray(result) ? result : (result.findings || []);
        
        findings.push(...fileFindings);

      } catch (error) {
        console.error(`Failed to scan file ${file.filename}:`, error);
      }
    }

    return findings;
  }
}

export const scanner = new ArmorIQScanner();