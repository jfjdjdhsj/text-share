import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export async function GET() {
  const info: Record<string, any> = {
    env: {
      has_DATABASE_URL: !!process.env.DATABASE_URL,
      node_env: process.env.NODE_ENV,
    },
    db: { connected: false, pasteTableExists: false },
    prisma: { version: (process as any).versions?.node ?? "unknown" },
  };

  try {
    // 测试连接
    await prisma.$queryRaw`SELECT 1`;
    info.db.connected = true;

    // 检查 Paste 表是否存在
    const rows = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_name = 'Paste'
       ) as "exists";`
    );
    info.db.pasteTableExists = !!rows?.[0]?.exists;

    return NextResponse.json({ ok: true, info }, { status: 200 });
  } catch (e: any) {
    info.error = String(e?.message || e);
    return NextResponse.json({ ok: false, info }, { status: 500 });
  }
}
