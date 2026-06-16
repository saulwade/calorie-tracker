import { NextRequest, NextResponse } from "next/server";
import { getOrCreateProfile, updateProfile } from "@/lib/profile";

export const runtime = "nodejs";

export async function GET() {
  const profile = await getOrCreateProfile();
  return NextResponse.json({ profile });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const profile = await updateProfile(body);
  return NextResponse.json({ profile });
}
