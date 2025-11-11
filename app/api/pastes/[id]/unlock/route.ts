import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { verifyPassword } from "@/src/lib/crypto";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const password = String(body?.password || "");

    const paste = await prisma.paste.findUnique({ where: { id: params.id } });
    if (!paste) return NextResponse.json({ message: "不存在" }, { status: 404 });

    const expired =
      (paste.expiresAt && paste.expiresAt.getTime() <= Date.now()) ||
      (paste.maxViews !== null && paste.maxViews !== undefined && paste.views >= paste.maxViews);

    if (expired) return NextResponse.json({ message: "已失效" }, { status: 410 });
    if (!paste.pwHash || !paste.pwSalt || !paste.pwParams) {
      return NextResponse.json({ message: "未设置密码" }, { status: 400 });
    }

    const ok = await verifyPassword(password, paste.pwSalt, paste.pwHash, paste.pwParams);
    if (!ok) return NextResponse.json({ message: "密码错误" }, { status: 401 });

    await prisma.paste.update({
      where: { id: paste.id },
      data: { views: { increment: 1 } },
    });

    return NextResponse.json({ content: paste.content });
  } catch (err: any) {
    console.error("[/api/pastes/:id/unlock] UnlockError:", err);
    return NextResponse.json({ message: "服务器错误" }, { status: 500 });
  }
}
