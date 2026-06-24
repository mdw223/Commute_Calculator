import { NextResponse } from "next/server";
import { geocodeAutocomplete } from "@/lib/ors";
import type { Coordinates } from "@/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      query?: string;
      focus?: Coordinates;
    };
    const query = body.query?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters" },
        { status: 400 }
      );
    }

    const focus =
      body.focus &&
      Array.isArray(body.focus) &&
      body.focus.length === 2
        ? body.focus
        : undefined;

    const suggestions = await geocodeAutocomplete(query, focus);
    return NextResponse.json({ suggestions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Geocoding failed";
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
