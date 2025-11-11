"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import clsx from "clsx";
import { QRCodeSVG } from "qrcode.react";

const schema = z.object({
  content: z.string().min(1, "请输入要分享的文本"),
  enablePassword: z.boolean(),
  password: z.string().optional(),
  enableExpiry: z.boolean(),
  expiryMinutes: z.number().int().positive().optional(),
  enableMaxViews: z.boolean(),
  maxViews: z.number().int().positive().optional(),
  burnOnce: z.boolean(),
});

export default function HomePage() {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 复制按钮反馈消失
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1200);
    return () => clearTimeout(t);
  }, [copied]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    setLink(null);

    const form = new FormData(e.currentTarget);
    const enablePassword = form.get("enablePassword") === "on";
    const enableExpiry = form.get("enableExpiry") === "on";
    const enableMaxViews = form.get("enableMaxViews") === "on";
    const burnOnce = form.get("burnOnce") === "on";

    // 关键点：未勾选则传 undefined（而不是 0），避免 “Number must be greater than 0”
    const expiryMinutes =
      enableExpiry ? Number(form.get("expiryMinutes") || 0) || undefined : undefined;

    // burnOnce 优先：将 maxViews 视为 1，并认为已启用次数限制
    const maxViews =
      burnOnce ? 1 : enableMaxViews ? Number(form.get("maxViews") || 0) || undefined : undefined;

    const payload = {
      content: String(form.get("content") || ""),
      enablePassword,
      password: enablePassword ? String(form.get("password") || "") : undefined,
      enableExpiry,
      expiryMinutes,
      enableMaxViews: burnOnce ? true : enableMaxViews,
      maxViews,
      burnOnce,
    };

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      // 尝试给更友好的报错
      const first = parsed.error.issues[0];
      const msg =
        first?.path?.[0] === "expiryMinutes" || first?.path?.[0] === "maxViews"
          ? "请填写一个大于 0 的整数"
          : first?.message || "表单不合法";
      setErr(msg);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/pastes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) throw new Error(await res.text());
      const { id } = await res.json();
      const url = `${location.origin}/p/${id}`;
      setLink(url);
    } catch (e: any) {
      setErr(e?.message || "创建失败");
    } finally {
      setLoading(false);
    }
  }

  const qrSize = useMemo(() => 196, []);

  return (
    <main className="card p-6 space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">要分享的文本</label>
          <textarea name="content" rows={8} className="textarea" placeholder="在这里粘贴文本…" required />
        </div>

        <div className="row">
          <div className="space-y-2">
            <label className="label flex items-center gap-2">
              <input type="checkbox" name="enablePassword" className="h-4 w-4" />
              启用密码
            </label>
            <input name="password" type="password" className="input" placeholder="设置访问密码（可选）" />
            <p className="note">密码将使用 <code>scrypt</code> 强哈希，服务器仅保存哈希值，无法反推明文。</p>
          </div>

          <div className="space-y-2">
            <label className="label flex items-center gap-2">
              <input type="checkbox" name="enableExpiry" className="h-4 w-4" />
              启用时间限制
            </label>
            <input name="expiryMinutes" type="number" min={1} className="input" placeholder="有效分钟数（例如 60）" />
            <p className="note">到期后链接立刻失效。</p>
          </div>
        </div>

        <div className="row">
          <div className="space-y-2">
            <label className="label flex items-center gap-2">
              <input type="checkbox" name="enableMaxViews" className="h-4 w-4" />
              启用查看次数限制
            </label>
            <input name="maxViews" type="number" min={1} className="input" placeholder="允许查看次数（例如 3）" />
            <p className="note">达到次数后自动失效；不勾选则不限制。</p>
          </div>

          <div className="space-y-2">
            <label className="label flex items-center gap-2">
              <input type="checkbox" name="burnOnce" className="h-4 w-4" />
              🔥 阅读后焚毁（一次性）
            </label>
            <p className="note">开启后该链接仅可查看 1 次，随后立即失效。</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className={clsx("btn-primary", loading && "opacity-70")} disabled={loading}>
            {loading ? "创建中…" : "创建分享链接"}
          </button>
          {err && <span className="text-sm text-red-500">{err}</span>}
        </div>

        {link && (
          <div className="mt-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-800 space-y-3">
            <div className="text-sm text-slate-600 dark:text-slate-300">分享链接：</div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <a className="font-mono break-all underline" href={link} target="_blank" rel="noreferrer">
                {link}
              </a>
              <button
                type="button"
                className="btn-primary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    setCopied(true);
                  } catch {
                    // 兼容部分浏览器的限制
                    const input = document.createElement("input");
                    input.value = link;
                    document.body.appendChild(input);
                    input.select();
                    document.execCommand("copy");
                    document.body.removeChild(input);
                    setCopied(true);
                  }
                }}
              >
                {copied ? "已复制 ✓" : "复制链接"}
              </button>
            </div>

            <div className="pt-2">
              <div className="label mb-2">二维码（扫码打开）：</div>
              <div className="inline-block rounded-xl border border-slate-300 dark:border-slate-700 bg-white p-3">
                <QRCodeSVG value={link} size={qrSize} includeMargin />
              </div>
            </div>
          </div>
        )}
      </form>
    </main>
  );
}
