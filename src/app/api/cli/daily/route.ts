import { NextResponse } from "next/server";
import { getDaily } from "@/lib/daily";

// `korin daily`: o desafio do dia (sorteia se ainda não houver).
export async function GET() {
  const d = await getDaily();
  if (!d) return NextResponse.json({ error: "sem desafio do dia" }, { status: 404 });
  return NextResponse.json({ day: d.day, slug: d.slug, title: d.title, difficulty: d.difficulty });
}
