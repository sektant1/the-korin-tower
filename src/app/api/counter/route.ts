import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const KEY = "visits";

export async function GET() {
  const c = await prisma.counter.findUnique({ where: { key: KEY } });
  return NextResponse.json({ value: c?.value ?? 0 });
}

// O cliente chama POST uma vez por sessão do navegador.
export async function POST() {
  const c = await prisma.counter.upsert({
    where: { key: KEY },
    create: { key: KEY, value: 1 },
    update: { value: { increment: 1 } },
  });
  return NextResponse.json({ value: c.value });
}
