import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const PROJECT_DIR = process.env.SPUTNIK_PROJECT_DIR ?? "/opt/sputnik";

export type OpsAction =
  | "ping"
  | "git_pull_deploy"
  | "restart_pm2"
  | "restart_sshd"
  | "pm2_status";

async function run(cmd: string, args: string[], cwd = PROJECT_DIR) {
  return execFileAsync(cmd, args, {
    cwd,
    timeout: 300_000,
    maxBuffer: 4 * 1024 * 1024
  });
}

async function gitPullDeploy() {
  let out = "";
  for (const args of [
    ["fetch", "origin"],
    ["reset", "--hard", "origin/main"]
  ] as const) {
    const r = await run("git", ["-C", PROJECT_DIR, ...args], PROJECT_DIR);
    out += `$ git ${args.join(" ")}\n${r.stdout}${r.stderr}`;
  }

  try {
    const r = await run("npm", ["ci", "--omit=dev"]);
    out += r.stdout + r.stderr;
  } catch {
    const r = await run("npm", ["install"]);
    out += r.stdout + r.stderr;
  }

  const build = await run("npm", ["run", "build"]);
  out += build.stdout + build.stderr;

  await run("bash", [`${PROJECT_DIR}/scripts/pm2-restart.sh`], PROJECT_DIR);
  return { stdout: out + "\npm2 restarted\n", stderr: "" };
}

const ALLOWED: Record<OpsAction, () => Promise<{ stdout: string; stderr: string }>> = {
  ping: async () => ({ stdout: "pong", stderr: "" }),
  git_pull_deploy: gitPullDeploy,
  restart_pm2: () => run("bash", [`${PROJECT_DIR}/scripts/pm2-restart.sh`], PROJECT_DIR),
  restart_sshd: () =>
    execFileAsync("systemctl", ["restart", "ssh"], { timeout: 30_000, maxBuffer: 256 * 1024 }),
  pm2_status: () => execFileAsync("pm2", ["list"], { timeout: 15_000, maxBuffer: 512 * 1024 })
};

export async function runOpsAction(action: OpsAction) {
  const fn = ALLOWED[action];
  if (!fn) throw new Error("UNKNOWN_ACTION");
  return fn();
}
