import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("categories").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        {
          status: "unhealthy",
          db: "error",
          version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "healthy",
      db: "ok",
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
    });
  } catch {
    return NextResponse.json(
      {
        status: "unhealthy",
        db: "error",
        version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
      },
      { status: 503 }
    );
  }
}
