import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { runOpsAction, type OpsAction } from "@/lib/server/ops";

const ACTIONS: OpsAction[] = [
  "ping",
  "git_pull_deploy",
  "restart_pm2",
  "restart_sshd",
  "pm2_status"
];

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  return NextResponse.json({
    service: "sputnik-admin-ops",
    actions: ACTIONS,
    hint: "POST JSON { \"action\": \"ping\" | \"git_pull_deploy\" | \"restart_sshd\" | ... }"
  });
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "") as OpsAction;

  if (!ACTIONS.includes(action)) {
    return NextResponse.json({ error: "UNKNOWN_ACTION", allowed: ACTIONS }, { status: 400 });
  }

  try {
    const { stdout, stderr } = await runOpsAction(action);
    return NextResponse.json({ ok: true, action, stdout, stderr });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("admin ops failed:", action, err);
    return NextResponse.json({ ok: false, action, error: message }, { status: 500 });
  }
}
