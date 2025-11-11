"use client";

import { useState } from "react";
import { z } from "zod";
import clsx from "clsx";

const schema = z.object({
  content: z.string().min(1, "请输入要分享的文本"),
  enablePassword: z.boolean(),
  password: z.string().optional(),
  enableExpiry: z.boolean(),
  expiryMinutes: z.coerce.number().int().positive().optional(),
  enableMaxViews: z.boolean(),
  maxViews: z.coerce.number().int().positive().optional(),
});

export default function HomePage() {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    setLink(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      content: String(form.get("content") || ""),
      enablePassword: form.get("enablePassword") === "on",
      password: String(form.get("password") || ""),
      enableExpiry: form.get("enableExpiry") === "on",
      expiryMinutes: Number(form.get("expiryMinutes") || 0),
      enableMaxViews: form.get("enableMaxViews") === "on",
      maxViews: Number(form.get("maxViews") || 0),
    };

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message || "表单不合法");
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
      setErr(e.message || "创建失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="card p-6">
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
        </div>

        <div className="flex items-center gap-3">
          <button className={clsx("btn-primary", loading && "opacity-70")} disabled={loading}>
            {loading ? "创建中…" : "创建分享链接"}
          </button>
          {err && <span className="text-sm text-red-500">{err}</span>}
        </div>

        {link && (
          <div className="mt-4 p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
            <div className="text-sm text-slate-600 dark:text-slate-300">分享链接：</div>
            <a className="font-mono break-all underline" href={link}>{link}</a>
          </div>
        )}
      </form>
    </main>
  );
}
