import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const all = await prisma.challenge.findMany({ select: { slug: true } });
  const pick = all[Math.floor(Math.random() * all.length)];
  return NextResponse.redirect(new URL(pick ? `/desafio/${pick.slug}` : "/desafios", req.url));
}
