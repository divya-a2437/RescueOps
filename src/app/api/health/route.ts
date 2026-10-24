
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("incidents")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Supabase diagnostic:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      return NextResponse.json(
        {
          ok: false,
          message: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "RescueOps database connected.",
      recordsFound: data.length,
    });
  } catch (error) {
    console.error("Connection diagnostic:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Unknown connection error",
      },
      { status: 500 }
    );
  }
}
