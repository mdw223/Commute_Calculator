import { NextResponse } from "next/server";
import { getDirections } from "@/lib/ors";
import type { Coordinates } from "@/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { coordinates?: Coordinates[] };

    if (!body.coordinates || body.coordinates.length < 2) {
      return NextResponse.json(
        { error: "At least 2 coordinates are required" },
        { status: 400 }
      );
    }

    if (body.coordinates.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 stops allowed" },
        { status: 400 }
      );
    }

    const route = await getDirections(body.coordinates);
    return NextResponse.json(route);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Routing failed";
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
