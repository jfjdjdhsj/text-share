export const runtime = "nodejs";
export const preferredRegion = ["iad1"];

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

// GET: 返回元信息；若无需密码且未过期，直接返回内容并+1
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const paste = await prisma.paste.findUnique({
      where: { id: params.id },
      include: { uploads: { select: { id: true, filename: true, url: true, size: true } } }
    });
    if (!paste) return NextResponse.json({ message: "不存在" }, { status: 404 });

    const expired =
      (paste.expiresAt && paste.expiresAt.getTime() <= Date.now()) ||
      (paste.maxViews !== null && paste.maxViews !== undefined && paste.views >= paste.maxViews);

    const remainingViews =
      paste.maxViews === null || paste.maxViews === undefined
        ? null
        : Math.max(paste.maxViews - paste.views, 0);

    // 需要密码或已过期：只给元信息
    if (paste.pwHash || expired) {
      return NextResponse.json({
        requiresPassword: !!paste.pwHash,
        expired,
        remainingViews,
        hasFiles: paste.uploads.length > 0
      });
    }

    // 不需要密码：直接计数+返回内容（单次往返）
    await prisma.paste.update({ where: { id: paste.id }, data: { views: { increment: 1 } } });

    return NextResponse.json({
      requiresPassword: false,
      expired: false,
      remainingViews: remainingViews === null ? null : Math.max(remainingViews - 1, 0),
      content: paste.content,
      files: paste.uploads
    });
  } catch (e) {
    console.error("[GET paste]", e);
    return NextResponse.json({ message: "服务器错误" }, { status: 500 });
  }
}
