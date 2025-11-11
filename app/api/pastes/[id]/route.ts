import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const paste = await prisma.paste.findUnique({ where: { id: params.id } });
  if (!paste) return NextResponse.json({ message: "不存在" }, { status: 404 });

  const expired =
    (paste.expiresAt && paste.expiresAt.getTime() <= Date.now()) ||
    (paste.maxViews !== null && paste.maxViews !== undefined && paste.views >= paste.maxViews);

  const remainingViews =
    paste.maxViews === null || paste.maxViews === undefined
      ? null
      : Math.max(paste.maxViews - paste.views, 0);

  return NextResponse.json({
    requiresPassword: !!paste.pwHash,
    expired,
    remainingViews,
  });
}

// 无密码的情况，POST 返回内容并计数 +1（密码情况在 unlock 接口处理）
export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const paste = await prisma.paste.findUnique({ where: { id: params.id } });
  if (!paste) return NextResponse.json({ message: "不存在" }, { status: 404 });

  const expired =
    (paste.expiresAt && paste.expiresAt.getTime() <= Date.now()) ||
    (paste.maxViews !== null && paste.maxViews !== undefined && paste.views >= paste.maxViews);

  if (expired) return NextResponse.json({ message: "已失效" }, { status: 410 });

  if (paste.pwHash) {
    return NextResponse.json({ message: "需要密码" }, { status: 403 });
  }

  await prisma.paste.update({
    where: { id: paste.id },
    data: { views: { increment: 1 } },
  });

  return NextResponse.json({ content: paste.content });
}
