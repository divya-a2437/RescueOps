
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { incidentSchema } from "@/lib/incident-schema";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in to view incidents." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("incidents")
      .select(
        "id, incident_code, title, description, location, category, severity, status, occurred_at, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Incident retrieval failed:", error);

      return NextResponse.json(
        { error: "Unable to load incidents." },
        { status: 500 }
      );
    }

    return NextResponse.json({ incidents: data ?? [] });
  } catch (error) {
    console.error("Incident GET failed:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in to create an incident." },
        { status: 401 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    const parsed = incidentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Please check the incident details.",
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const input = parsed.data;

    const { data: incident, error } = await supabase
      .from("incidents")
      .insert({
        incident_code: `INC-${randomUUID().slice(0, 8).toUpperCase()}`,
        title: input.title,
        description: input.description || null,
        location: input.location || null,
        category: input.category,
        severity: input.severity,
        occurred_at: input.occurred_at,
        created_by: user.id,
      })
      .select(
        "id, incident_code, title, description, location, category, severity, status, occurred_at, created_at"
      )
      .single();

    if (error) {
      console.error("Incident creation failed:", error);

      return NextResponse.json(
        { error: "Unable to save the incident to the database." },
        { status: 500 }
      );
    }

    return NextResponse.json({ incident }, { status: 201 });
  } catch (error) {
    console.error("Incident POST failed:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
