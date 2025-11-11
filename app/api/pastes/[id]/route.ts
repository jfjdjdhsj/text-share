import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const paste = await prisma.paste.findUnique({
      where: { id: params.id },
      include: { uploads: { select: { id: true } } }
    });
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
      hasFiles: paste.uploads.length > 0
    });
  } catch (e) {
    console.error("[GET paste meta]", e);
    return NextResponse.json({ message: "服务器错误" }, { status: 500 });
  }
}

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const paste = await prisma.paste.findUnique({
      where: { id: params.id },
      include: { uploads: { select: { id: true, filename: true, url: true, size: true } } }
    });
    if (!paste) return NextResponse.json({ message: "不存在" }, { status: 404 });

    const expired =
      (paste.expiresAt && paste.expiresAt.getTime() <= Date.now()) ||
      (paste.maxViews !== null && paste.maxViews !== undefined && paste.views >= paste.maxViews);
    if (expired) return NextResponse.json({ message: "已失效" }, { status: 410 });
    if (paste.pwHash) return NextResponse.json({ message: "需要密码" }, { status: 403 });

    await prisma.paste.update({ where: { id: paste.id }, data: { views: { increment: 1 } } });

    return NextResponse.json({ content: paste.content, files: paste.uploads });
  } catch (e) {
    console.error("[POST paste read]", e);
    return NextResponse.json({ message: "服务器错误" }, { status: 500 });
  }
}
