import { NextRequest, NextResponse } from 'next/server';
import { claw } from '@/lib/armor/claw';
import { iq } from '@/lib/armor/iq';
import { developerReceivesAISecurityExplanations } from '@/ai/flows/developer-receives-ai-security-explanations';
import { App } from 'octokit';
import prisma from '@/lib/prisma'; // Make sure this path matches your Prisma client export

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const event = req.headers.get('x-github-event');

    if (!['pull_request'].includes(event || '')) {
      return NextResponse.json({ message: 'Event not tracked' }, { status: 200 });
    }

    const { action, pull_request, repository, installation } = payload;

    // Supported actions: opened, synchronize, reopened
    if (!['opened', 'synchronize', 'reopened'].includes(action)) {
      return NextResponse.json({ message: 'Action not tracked' }, { status: 200 });
    }

    if (!installation || !installation.id) {
       return NextResponse.json({ message: 'No GitHub App installation ID found' }, { status: 400 });
    }

    console.log(`Processing PR #${pull_request.number} on ${repository.full_name}`);

    // Initialize the GitHub App Client using your environment variables
    const appId = process.env.GITHUB_APP_ID!;
    const privateKey = process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, '\n'); 

    const appClient = new App({
      appId,
      privateKey,
    });

    const octokit = await appClient.getInstallationOctokit(installation.id);

    // 1. Fetch real changed files from the Pull Request
    const { data: pullRequestFiles } = await octokit.rest.pulls.listFiles({
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: pull_request.number,
    });

    const fileNames = pullRequestFiles.map((file: any) => file.filename);

    // 2. ArmorClaw Scan
    const findings = await claw.scanPullRequest(fileNames);

    // 3. AI Analysis
    const enrichedFindings = await Promise.all(findings.map(async (finding: any) => {
      const aiResponse = await developerReceivesAISecurityExplanations({
        findingType: finding.type,
        severity: finding.severity,
        description: finding.description,
        fileLocation: finding.fileLocation,
        codeSnippet: finding.codeSnippet || ''
      });
      return {
        ...finding,
        explanation: aiResponse.explanation,
        remediation: aiResponse.remediationSuggestions
      };
    }));

    // 4. ArmorIQ Policy Decision
    const decision = iq.evaluateFindings(findings);

    // 5. Update GitHub Status Check
    const conclusion = decision === 'PASS' ? 'success' : (decision === 'REVIEW REQUIRED' ? 'action_required' : 'failure');
    
    await octokit.rest.checks.create({
      owner: repository.owner.login,
      repo: repository.name,
      name: 'SecureFlow Scan',
      head_sha: pull_request.head.sha,
      status: 'completed',
      conclusion: conclusion,
      output: {
        title: `Policy Decision: ${decision}`,
        summary: `SecureFlow detected ${findings.length} potential security issues.`,
      }
    });

    // 6. Post a PR Comment with AI Explanations
    if (enrichedFindings.length > 0) {
      let commentBody = `### 🛡️ SecureFlow AI Security Report\n\n`;
      enrichedFindings.forEach((f: any) => {
        commentBody += `**[${f.severity}] ${f.type} in \`${f.fileLocation}\`**\n`;
        commentBody += `> ${f.explanation}\n\n`;
        commentBody += `**Remediation:** ${f.remediation}\n\n---\n`;
      });

      await octokit.rest.issues.createComment({
        owner: repository.owner.login,
        repo: repository.name,
        issue_number: pull_request.number,
        body: commentBody,
      });
    }

    console.log(`Decision: ${decision} reported back to GitHub.`);

    // 7. Persist to DB
    // First, verify the repository exists in your DB so we can link the PR to it
    const dbRepo = await prisma.repository.findUnique({
      where: { githubId: repository.id }
    });

    if (dbRepo) {
      // Upsert the PR (creates it if new, updates it if "synchronize" triggered a re-scan)
      const dbPr = await prisma.pullRequest.upsert({
        where: { githubId: pull_request.id },
        update: {
          title: pull_request.title,
          state: pull_request.state, 
          status: decision,
        },
        create: {
          githubId: pull_request.id,
          prNumber: pull_request.number,
          title: pull_request.title,
          state: pull_request.state,
          status: decision,
          repositoryId: dbRepo.id
        }
      });

      // Calculate a basic numerical risk score based on severities
      const severityScores: Record<string, number> = { CRITICAL: 10, HIGH: 5, MEDIUM: 3, LOW: 1 };
      const riskScore = findings.reduce((score: number, f: any) => score + (severityScores[f.severity.toUpperCase()] || 0), 0);

      // Create the ScanResult and use Prisma's nested writes to create all associated Findings at once
      await prisma.scanResult.create({
        data: {
          pullRequestId: dbPr.id,
          riskScore,
          policyDecision: decision,
          findings: {
            create: enrichedFindings.map((f: any) => ({
              type: f.type,
              severity: f.severity,
              fileLocation: f.fileLocation,
              codeSnippet: f.codeSnippet || null,
              explanation: f.explanation || null,
              remediation: f.remediation || null
            }))
          }
        }
      });

      console.log(`Successfully persisted scan results and ${enrichedFindings.length} findings to the database.`);
    } else {
      console.warn(`Repository ${repository.full_name} (ID: ${repository.id}) not found in the database. Skipping persistence.`);
    }

    return NextResponse.json({ 
      success: true, 
      decision, 
      findingCount: findings.length 
    });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}