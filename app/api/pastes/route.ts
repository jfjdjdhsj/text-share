import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { z } from "zod";
import { hashPassword } from "@/src/lib/crypto";

const bodySchema = z.object({
  content: z.string().default(""),
  enablePassword: z.boolean(),
  password: z.string().optional(),
  enableExpiry: z.boolean(),
  expiryMinutes: z.number().int().positive().optional(),
  enableMaxViews: z.boolean(),
  maxViews: z.number().int().positive().optional(),
  burnOnce: z.boolean().optional(),
  fileIds: z.array(z.string()).max(10).optional()
}).refine((d) => (d.content?.trim()?.length ?? 0) > 0 || (d.fileIds?.length ?? 0) > 0, {
  message: "请填写文本或选择至少一个文件",
  path: ["content"]
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || "参数不合法" },
        { status: 400 }
      );
    }

    const {
      content, enablePassword, password,
      enableExpiry, expiryMinutes,
      enableMaxViews, maxViews,
      fileIds, burnOnce
    } = parsed.data;

    // 密码哈希
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

    // ✅ 文本默认 7 天到期（如果没有启用“自定义分钟数”）
    const now = Date.now();
    const expiresAt =
      enableExpiry && expiryMinutes
        ? new Date(now + expiryMinutes * 60 * 1000)
        : new Date(now + 7 * 24 * 60 * 60 * 1000); // 7 天

    const maxViewsFinal = burnOnce ? 1 : (enableMaxViews && maxViews ? maxViews : null);

    const rec = await prisma.paste.create({
      data: {
        content: content ?? "",
        pwSalt, pwHash, pwParams,
        expiresAt, // 始终写入一个过期时间（要么是自定义分钟，要么 7 天）
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
