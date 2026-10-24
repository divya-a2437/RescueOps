import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const organizationId = new URL(request.url).searchParams.get("organizationId");
    if (organizationId) {
      const { data: members, error } = await supabase
        .from("organization_memberships")
        .select("user_id, role, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Workspace members retrieval failed:", error);
        return NextResponse.json({ error: "Unable to load workspace members." }, { status: 500 });
      }
      return NextResponse.json({ members: members ?? [] });
    }

    const { data, error } = await supabase
      .from("organization_memberships")
      .select("organization_id, role, created_at, organizations(id, name, slug)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Workspace retrieval failed:", error);
      return NextResponse.json({ error: "Unable to load your workspaces." }, { status: 500 });
    }
    return NextResponse.json({ workspaces: data ?? [] });
  } catch (error) {
    console.error("Organization GET failed:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    let body: { action?: string; name?: string; organizationId?: string; invitationCode?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    if (body.action === "create") {
      const name = body.name?.trim();
      if (!name || name.length < 2 || name.length > 80) {
        return NextResponse.json({ error: "Workspace name must be between 2 and 80 characters." }, { status: 400 });
      }
      const { data, error } = await supabase.rpc("create_organization", {
        org_name: name,
        org_slug: `workspace-${randomUUID()}`,
      });
      if (error) {
        console.error("Organization creation failed:", error);
        return NextResponse.json({ error: "Unable to create the workspace." }, { status: 500 });
      }
      return NextResponse.json({ organizationId: data, message: "Workspace created." }, { status: 201 });
    }

    if (body.action === "create_invitation") {
      if (!body.organizationId) {
        return NextResponse.json({ error: "Choose a workspace first." }, { status: 400 });
      }
      const { data, error } = await supabase.rpc("create_org_invitation_code", { org_id: body.organizationId });
      if (error) {
        const status = error.message.includes("Only organisation owners") ? 403 : 400;
        return NextResponse.json({ error: error.message }, { status });
      }
      return NextResponse.json({ invitationCode: data });
    }

    if (body.action === "join") {
      const invitationCode = body.invitationCode?.trim();
      if (!invitationCode) {
        return NextResponse.json({ error: "Enter an invitation code." }, { status: 400 });
      }
      const { data, error } = await supabase.rpc("join_organization", { invitation_code: invitationCode });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ organizationId: data, message: "You joined the workspace." });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    console.error("Organization POST failed:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
