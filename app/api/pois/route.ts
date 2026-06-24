import { NextResponse } from "next/server";
import { searchPois } from "@/lib/ors";
import type { Coordinates } from "@/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      center?: Coordinates;
      name?: string;
      categoryIds?: number[];
      bufferMeters?: number;
    };

    if (
      !body.center ||
      !Array.isArray(body.center) ||
      body.center.length !== 2
    ) {
      return NextResponse.json(
        { error: "center [lng, lat] is required" },
        { status: 400 }
      );
    }

    const hasName = Boolean(body.name?.trim());
    const hasCategories = Boolean(body.categoryIds?.length);

    if (!hasName && !hasCategories) {
      return NextResponse.json(
        { error: "Provide a search term or at least one category" },
        { status: 400 }
      );
    }

    const results = await searchPois({
      center: body.center,
      name: body.name,
      categoryIds: body.categoryIds,
      bufferMeters: body.bufferMeters,
    });

    return NextResponse.json({ results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "POI search failed";
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
