import type { Action } from '@elizaos/core';
import { agentStateManager, AgentStatus } from '../../../../shared/agent-state.ts';
import { getRepoContext, fetchFile, fetchCommits, fetchCommitDiff } from '../../../../shared/github-service.ts';

/**
 * Hawk's OWASP-style security audit.
 * Fetches code from connected repo and checks against OWASP Top 10.
 */
export const securityAudit: Action = {
  name: 'SECURITY_AUDIT',
  similes: ['OWASP_SCAN', 'SECURITY_SCAN', 'VULNERABILITY_SCAN', 'AUDIT_SECURITY'],
  description: 'Run a security audit against OWASP Top 10 on the connected codebase. Checks for injection, broken auth, XSS, insecure deserialization, and more.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Hawk', AgentStatus.REVIEWING, 'OWASP security audit');

    const text = (message.content?.text as string) || '';

    // Try to fetch specific files or repo overview
    let codeContext = '';
    const filePatterns = text.match(/[`"']([^`"']+\.[a-z]{1,4})[`"']/gi) || [];
    const filePaths = filePatterns.map((f) => f.replace(/[`"']/g, ''));

    for (const path of filePaths.slice(0, 3)) {
      const content = await fetchFile(path);
      if (content) codeContext += `\n### ${path}\n\`\`\`\n${content.slice(0, 2000)}\n\`\`\`\n`;
    }

    // Also fetch recent commit diffs for change-based analysis
    if (!codeContext) {
      const commits = await fetchCommits(3);
      for (const commit of commits) {
        const diff = await fetchCommitDiff(commit.sha);
        if (diff) {
          codeContext += `\n### Commit: "${commit.message}" by ${commit.author}\n\`\`\`diff\n${diff.slice(0, 2000)}\n\`\`\`\n`;
        }
      }
    }

    if (!codeContext) {
      const repo = await getRepoContext();
      if (repo) codeContext = repo;
    }

    const auditPrompt = codeContext
      ? `Running OWASP Top 10 security audit on the codebase:\n\n${codeContext}\n\nCheck for:\n1. **A01 - Broken Access Control** — missing auth, privilege escalation\n2. **A02 - Cryptographic Failures** — weak hashing, exposed secrets\n3. **A03 - Injection** — SQL injection, command injection, XSS\n4. **A04 - Insecure Design** — missing rate limiting, no input validation\n5. **A05 - Security Misconfiguration** — default creds, verbose errors\n6. **A06 - Vulnerable Components** — outdated dependencies with known CVEs\n7. **A07 - Authentication Failures** — weak passwords, missing MFA\n8. **A08 - Data Integrity Failures** — unsigned updates, insecure deserialization\n9. **A09 - Logging Failures** — missing audit logs, sensitive data in logs\n10. **A10 - SSRF** — unvalidated URLs, internal service access\n\nRate each finding: CRITICAL / HIGH / MEDIUM / LOW`
      : `Connect a GitHub repo in the Session tab so I can audit your codebase. Or paste specific code and I'll check it against OWASP Top 10.`;

    if (callback) {
      await callback({
        text: auditPrompt,
        actions: ['SECURITY_AUDIT'],
      });
    }

    agentStateManager.setState('Hawk', AgentStatus.IDLE);
    return { text: 'Security audit complete', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Run a security audit on our code' } },
      { name: 'Hawk', content: { text: 'Running OWASP Top 10 audit on the connected codebase. I will report real findings with severity ratings.', actions: ['SECURITY_AUDIT'] } },
    ],
  ],
};
