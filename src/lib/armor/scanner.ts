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

// 1. Files that should NEVER be scanned by an LLM
const IGNORED_FILES = [
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico',
  'dist/', 'build/', '.next/', 'public/'
];

function shouldIgnore(filename: string): boolean {
  return IGNORED_FILES.some(ignored => filename.includes(ignored));
}

// Helper function to pause execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class ArmorIQScanner {
  async scanPullRequest(files: FileChange[]): Promise<ScanFinding[]> {
    const findings: ScanFinding[] = [];
    
    // 2. Max characters for a patch to prevent 413 Payload Too Large
    // ~12000 tokens is roughly 48000 characters. We cap at 15000 to be extremely safe.
    const MAX_PATCH_LENGTH = 15000; 

    for (const file of files) {
      if (shouldIgnore(file.filename)) {
        console.log(`🛡️ Skipping ignored file: ${file.filename}`);
        continue;
      }

      let patchContent = file.patch || '';
      
      if (patchContent.length > MAX_PATCH_LENGTH) {
        console.log(`⚠️ Truncating massive file: ${file.filename}`);
        patchContent = patchContent.substring(0, MAX_PATCH_LENGTH) + "\n\n...[TRUNCATED FOR SIZE]...";
      }

      const prompt = `Analyze the following code changes (git patch) for security vulnerabilities.
Look for:
1. Hardcoded secrets (actual string values like "sk-...").
2. Contextual leaks (explicitly logging variables to the console or exposing them to clients).
3. Logic flaws.

File: ${file.filename}
Patch:
${patchContent}

Respond ONLY in strictly valid JSON containing an array of findings. If no vulnerabilities exist, return an empty array [].
Format:
[{
  "type": "Secret | Vulnerability | Misconfig",
  "severity": "CRITICAL | HIGH | MEDIUM | LOW",
  "description": "Detailed explanation.",
  "fileLocation": "${file.filename}",
  "codeSnippet": "The specific problematic line(s) of code"
}]`;

      // 3. Retry Logic & Rate Limit Handling
      let success = false;
      let retries = 3;

      while (!success && retries > 0) {
        try {
          console.log(`🔍 Scanning ${file.filename}...`);
          
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
          const result = JSON.parse(responseText);
          const fileFindings = Array.isArray(result) ? result : (result.findings || []);
          
          findings.push(...fileFindings);
          success = true;

          // Add a baseline delay between successful requests to prevent hitting the TPM limit
          await delay(3000); 

        } catch (error: any) {
          if (error.status === 429) {
            console.warn(`⏳ Rate limit reached scanning ${file.filename}. Waiting 15 seconds...`);
            await delay(15000); // Back off for 15s to allow token bucket to refill
            retries--;
          } else if (error.status === 413) {
            console.error(`❌ File STILL too large even after truncation: ${file.filename}. Skipping.`);
            break; // Do not retry 413s
          } else {
            console.error(`❌ Failed to scan file ${file.filename}:`, error);
            break;
          }
        }
      }
    }

    return findings;
  }
}

export const scanner = new ArmorIQScanner();