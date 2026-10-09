import { CopyButton } from "./copy-button";
import { Input } from "./ui/input";
import { GeneratedTokenField } from "./generated-token";
import { HOOK_FILES, REPO_RAW } from "@/lib/repo";

const CLAUDE_MD = `## Whim
- Tag each meaningful piece of UI with data-whim="<slug>" (for example sidebar, logo, new-project-cta). Keep slugs stable.
- Save explorations in /explorations/<subject>/, one file per variant.
- Save palettes as JSON in /explorations/palette/: {"name": "...", "colors": {"primary": "#d70000"}}
- Keep UI copy you are iterating on in .md files or copy.json.`;

/**
 * Setup is two things: make a token, and paste one prompt into Claude Code in the project to track. Claude fetches the hook itself.
 * The prompt carries everything the agent needs: where the hook goes, the config, the settings, and the CLAUDE.md snippet.
 */
/**
 * Four steps, always all shown so the page reads the same before and after setup: the prompt for Claude; the
 * token to hand Claude when it asks; the same token's line for Whim's own .env.local; and sending the first prompt.
 * `token` is Whim's token, or null when it has none yet; then the browser generates one and keeps it.
 */
export function SetupSteps({ origin, token, tokenMasked = false, whimDir }: { origin: string; token: string | null; tokenMasked?: boolean; whimDir: string | null }) {
  const endpoint = `${origin}/api/ingest`;
  const prompt = `Set up Whim capture in this project. Whim records each prompt and what it changed, so I can go back to any version of the design.

1. Put the three hook files in ./hook at the project root. Fetch them from GitHub:
${HOOK_FILES.map((f) => `   ${REPO_RAW}/hook/${f}`).join("\n")}
   (If GitHub is unreachable, ${origin}/api/setup/hook is the same three files as a tar.) They have no dependencies.
2. Create whim.config.json at the root. "urls" lists the pages Whim screenshots after each prompt; start with the home page and add any page whose parts I will be iterating on:
{
  "urls": ["<this app's local dev URL, e.g. http://localhost:3000>"],
  "endpoint": "${endpoint}",
  "tokenEnv": "WHIM_TOKEN",
  "include": ["src/**", "explorations/**", "public/**", "copy.json", "*.md"]
}
3. Register the hooks in .claude/settings.json (merge with what is there):
{
  "hooks": {
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "node \\"$CLAUDE_PROJECT_DIR/hook/whim-prompt.mjs\\"" }] }],
    "Stop": [{ "hooks": [{ "type": "command", "command": "node \\"$CLAUDE_PROJECT_DIR/hook/whim-stop.mjs\\"", "timeout": 60 }] }]
  }
}
4. Append this to CLAUDE.md:
${CLAUDE_MD}
5. Ask me for the Whim token (it is the WHIM_TOKEN value in Whim's own .env.local). Add it to this project's .env.local as WHIM_TOKEN. Make sure .env.local and .whim/ are gitignored.
6. Whim screenshots the pages in "urls" with Playwright, resolved from this project. Install it as a dev dependency with this project's package manager (for example pnpm add -D playwright), then run npx playwright install chromium. Skip this only if Playwright is already installed here.

Then tell me what you changed, in a few lines.`;
  const code = (t: string) => <code className="rounded-sm bg-muted px-1 font-mono text-[0.8em]">{t}</code>;
  const tokenField = (value: string, label: string) => (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <Input readOnly value={value} name="whim-token" autoComplete="off" spellCheck={false} aria-label={label} className="min-w-48 flex-1 bg-white font-mono text-xs" />
      <CopyButton text={value} label={`Copy ${label.toLowerCase()}`} announce="Copied" size="default" variant="default">Copy</CopyButton>
    </div>
  );
  const steps: { id: string; title: string; body: React.ReactNode }[] = [
    {
      id: "prompt",
      title: "Paste into Claude Code in your project's folder",
      body: (
        <>
          <p>Claude installs the hook, writes the config, and adds the conventions to CLAUDE.md. Partway through it will ask for your token. That is step 2.</p>
          <div className="flex flex-col overflow-hidden rounded-lg border bg-card">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
              <span className="text-xs text-muted-foreground">Prompt</span>
              <CopyButton text={prompt} label="Copy setup prompt" size="xs" variant="default" whim="whim-copy-button">Copy</CopyButton>
            </div>
            <pre tabIndex={0} role="region" aria-label="Setup prompt" className="max-h-80 overflow-auto p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap"><code>{prompt}</code></pre>
          </div>
        </>
      ),
    },
    {
      id: "token",
      title: "Paste your token into the terminal when Claude asks",
      body: token ? (
        tokenMasked ? (
          <p>Whim is deployed without a login, so the token is not printed here. It is the {code("WHIM_TOKEN")} value in this deployment&apos;s environment variables ({code(token)}). Set {code("WHIM_SHOW_TOKEN=1")} to print it once the deployment is protected.</p>
        ) : (
          tokenField(token, "Whim token")
        )
      ) : (
        <GeneratedTokenField as="value" label="Whim token" />
      ),
    },
  ];
  {
    steps.push({
      id: "configure",
      title: "Add your token to .env.local",
      body: (
        <>
          <p>
            Copy and paste this text into {whimDir ? code(`${whimDir}/.env.local`) : <>this deployment&apos;s environment variables</>}, then {whimDir ? <>restart {code("pnpm dev")}</> : "redeploy"}.
          </p>
          {token && !tokenMasked ? tokenField(`WHIM_TOKEN=${token}`, "Token line") : token ? <p>Already set.</p> : <GeneratedTokenField as="line" label="Token line" />}
        </>
      ),
    });
  }
  {
    steps.push({
      id: "wait",
      title: "Send a prompt in your project",
      body: <p>Ask Claude for any design change. When ready, this page will take you to the result.</p>,
    });
  }
  return (
    <div className="flex flex-col gap-14" data-whim="whim-setup-steps">
      {steps.map((step, i) => (
        <section key={step.id} aria-labelledby={`setup-${step.id}`} className="flex flex-col gap-2">
          <h2 id={`setup-${step.id}`}>Step {i + 1}</h2>
          <h3 className="-mb-1">{step.title}</h3>
          {step.body}
        </section>
      ))}
    </div>
  );
}
