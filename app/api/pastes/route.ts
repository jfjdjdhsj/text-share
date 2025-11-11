import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { z } from "zod";
import { hashPassword } from "@/src/lib/crypto";

const bodySchema = z.object({
  content: z.string().min(1),
  enablePassword: z.boolean(),
  password: z.string().optional(),
  enableExpiry: z.boolean(),
  expiryMinutes: z.number().int().positive().optional(),
  enableMaxViews: z.boolean(),
  maxViews: z.number().int().positive().optional(),
  burnOnce: z.boolean().optional(),
  fileIds: z.array(z.string()).max(10).optional()
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ message: "参数不合法" }, { status: 400 });

    const {
      content, enablePassword, password,
      enableExpiry, expiryMinutes,
      enableMaxViews, maxViews,
      fileIds, burnOnce
    } = parsed.data;

    let pwSalt: string | undefined;
    let pwHash: string | undefined;
    let pwParams: string | undefined;

    if (enablePassword) {
      if (!password || password.length < 4) {
        return NextResponse.json({ message: "密码至少 4 位" }, { status: 400 });
      }
      const hashed = await hashPassword(password);
      pwSalt = hashed.saltB64;
      pwHash = hashed.hashB64;
      pwParams = JSON.stringify(hashed.params);
    }

    const expiresAt =
      enableExpiry && expiryMinutes ? new Date(Date.now() + expiryMinutes * 60 * 1000) : null;
    const maxViewsFinal = burnOnce ? 1 : (enableMaxViews && maxViews ? maxViews : null);

    const rec = await prisma.paste.create({
      data: {
        content, pwSalt, pwHash, pwParams,
        expiresAt: expiresAt ?? undefined,
        maxViews: maxViewsFinal ?? undefined
      },
      select: { id: true }
    });

    if (fileIds?.length) {
      await prisma.upload.updateMany({
        where: { id: { in: fileIds } },
        data: { pasteId: rec.id }
      });
    }

    return NextResponse.json({ id: rec.id }, { status: 201 });
  } catch (err: any) {
    console.error("[/api/pastes] CreateError:", err);
    return NextResponse.json({ message: err?.message || "服务器错误" }, { status: 500 });
  }
}
