"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import clsx from "clsx";
import { QRCodeSVG } from "qrcode.react";

const MAX_FILES = 10;
const MAX_TOTAL = 10 * 1024 * 1024; // 10MB

const schema = z
  .object({
    content: z.string().default(""),
    enablePassword: z.boolean(),
    password: z.string().optional(),
    enableExpiry: z.boolean(),
    expiryMinutes: z.number().int().positive().optional(),
    enableMaxViews: z.boolean(),
    maxViews: z.number().int().positive().optional(),
    burnOnce: z.boolean(),
    fileIds: z.array(z.string()).max(10).optional(),
  })
  .refine(
    (d) =>
      (d.content?.trim()?.length ?? 0) > 0 || (d.fileIds?.length ?? 0) > 0,
    { message: "请填写文本或选择至少一个文件", path: ["content"] }
  );

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

// 与后端一致的“文本文件”判断辅助
const ALLOWED_EXT = new Set([
  "txt","md","markdown","csv","tsv","json","jsonl","log","xml",
  "yaml","yml","ini","conf","cfg","properties","env",
  "sh","bash","zsh","bat","cmd","ps1",
  "py","js","ts","tsx","jsx","mjs","cjs",
  "java","kt","go","rs","rb","php",
  "c","h","cpp","hpp","cs","swift",
  "sql"
]);
function isTextLike(name: string, type?: string) {
  const t = (type || "").toLowerCase();
  if (t.startsWith("text/")) return true;
  if (t === "application/json" || t === "application/xml") return true;
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/i);
  const ext = m ? m[1] : "";
  return ALLOWED_EXT.has(ext);
}

export default function HomePage() {
  const formRef = useRef<HTMLFormElement>(null);

  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [files, setFiles] = useState<File[]>([]);
  const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1200);
    return () => clearTimeout(t);
  }, [copied]);

  function onPickFiles(flist: FileList | null) {
    if (!flist) return;
    const picked = Array.from(flist);

    // 预检：仅文本文件
    for (const f of picked) {
      if (!isTextLike(f.name, (f as any).type)) {
        setErr("仅支持文本文件");
        return;
      }
    }

    const merged = [...files, ...picked].slice(0, MAX_FILES);
    const size = merged.reduce((s, f) => s + (f.size || 0), 0);
    if (size > MAX_TOTAL) {
      setErr("文件总大小不能超过 10MB");
      return;
    }
    setErr(null);
    setFiles(merged);
  }

  function removeFileAt(idx: number) {
    setFiles((fs) => fs.filter((_, i) => i !== idx));
  }

  async function uploadFiles(): Promise<string[]> {
    if (files.length === 0) return [];
    if (files.length > MAX_FILES) throw new Error(`最多 ${MAX_FILES} 个文件`);
    if (totalSize > MAX_TOTAL) throw new Error("文件总大小不能超过 10MB");
    for (const f of files) {
      if (!isTextLike(f.name, (f as any).type)) {
        throw new Error("仅支持文本文件");
      }
    }

    const fd = new FormData();
    for (const f of files) fd.append("files", f);

    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "文件上传失败");
    return (data.uploads as Array<{ id: string }>).map((u) => u.id);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    setLink(null);

    const el = formRef.current;
    if (!el) {
      setErr("表单未就绪，请刷新后重试");
      setLoading(false);
      return;
    }

    const form = new FormData(el);
    const enablePassword = form.get("enablePassword") === "on";
    const enableExpiry = form.get("enableExpiry") === "on";
    const enableMaxViews = form.get("enableMaxViews") === "on";
    const burnOnce = form.get("burnOnce") === "on";
    const password = enablePassword ? String(form.get("password") || "") : "";

    // Removed the password length check here:
    // if (enablePassword && password.length < 4) {
    //   setErr("密码至少 4 位");
    //   setLoading(false);
    //   return;
    // }

    const expiryMinutes = enableExpiry
      ? Number(form.get("expiryMinutes") || 0) || undefined
      : undefined;
    const maxViews = burnOnce
      ? 1
      : enableMaxViews
      ? Number(form.get("maxViews") || 0) || undefined
      : undefined;

    try {
      const fileIds = await uploadFiles();

      const payload = {
        content: String(form.get("content") || ""),
        enablePassword,
        password: enablePassword ? password : undefined,
        enableExpiry,
        expiryMinutes,
        enableMaxViews: burnOnce ? true : enableMaxViews,
        maxViews,
        burnOnce,
        fileIds,
      };

      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        throw new Error(first?.message || "请填写文本或选择至少一个文件");
      }

      const res = await fetch("/api/pastes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        let message = "创建失败";
        try {
          const text = await res.text();
          try {
            message = JSON.parse(text)?.message || message;
          } catch {
            message = text || message;
          }
        } catch {}
        throw new Error(message);
      }

      const { id } = await res.json();
      const url = `${location.origin}/p/${id}`;
      setLink(url);
      setFiles([]);
      el.reset();
    } catch (e: any) {
      setErr(e?.message || "创建失败");
    } finally {
      setLoading(false);
    }
  }

  const qrSize = useMemo(() => 196, []);

  return (
    <main className="card p-6 space-y-4">
      <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">要分享的文本（可留空仅分享文件）</label>
          <textarea
            name="content"
            rows={8}
            className="textarea"
            placeholder="在这里粘贴文本…"
          />
        </div>

        {/* 文件上传（仅文本） */}
        <div className="space-y-2">
          <label className="label">
            上传文件（最多 10 个，总计 ≤ 10MB；<b>仅支持文本文件</b>）
          </label>
          <input
            type="file"
            multiple
            // 常见文本类型与扩展名
            accept="text/*,application/json,application/xml,.txt,.md,.markdown,.csv,.tsv,.json,.jsonl,.log,.xml,.yaml,.yml,.ini,.conf,.cfg,.properties,.env,.sh,.bash,.zsh,.bat,.cmd,.ps1,.py,.js,.ts,.tsx,.jsx,.mjs,.cjs,.java,.kt,.go,.rs,.rb,.php,.c,.h,.cpp,.hpp,.cs,.swift,.sql"
            onChange={(e) => onPickFiles(e.currentTarget.files)}
            className="block"
          />
          <div className="note">
            已选 {files.length} 个文件，合计 {formatSize(totalSize)}
          </div>
          {files.length > 0 && (
            <ul className="text-sm list-disc pl-5 space-y-1">
              {files.map((f, i) => (
                <li key={i} className="break-all flex items-center gap-2">
                  <span>{f.name}</span>
                  <span className="text-xs text-slate-500">
                    （{formatSize(f.size)}）
                  </span>
                  <button
                    type="button"
                    className="ml-2 text-xs underline text-red-600 hover:opacity-80"
                    onClick={() => removeFileAt(i)}
                    aria-label={`删除 ${f.name}`}
                  >
                    删除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="row">
          <div className="space-y-2">
            <label className="label flex items-center gap-2">
              <input type="checkbox" name="enablePassword" className="h-4 w-4" />
              启用密码
            </label>
            <input
              name="password"
              type="password"
              className="input"
              placeholder="设置访问密码（可选）"
            />
            <p className="note">
              密码将使用 <code>scrypt</code> 强哈希，服务器仅保存哈希值。
            </p>
          </div>

          <div className="space-y-2">
            <label className="label flex items-center gap-2">
              <input type="checkbox" name="enableExpiry" className="h-4 w-4" />
              启用时间限制
            </label>
            <input
              name="expiryMinutes"
              type="number"
              min={1}
              className="input"
              placeholder="有效分钟数（例如 60）"
            />
            <p className="note">
              不设置则文本默认 7 天到期；附件会在上传后 24 小时自动清理。
            </p>
          </div>
        </div>

        <div className="row md:items-center">
          <div className="space-y-2">
            <label className="label flex items-center gap-2">
              <input
                type="checkbox"
                name="enableMaxViews"
                className="h-4 w-4"
              />
              启用查看次数限制
            </label>
            <input
              name="maxViews"
              type="number"
              min={1}
              className="input"
              placeholder="允许查看次数（例如 3）"
            />
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
            <div className="text-sm text-slate-600 dark:text-slate-300">
              分享链接：
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <a
                className="font-mono break-all underline"
                href={link}
                target="_blank"
                rel="noreferrer"
              >
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
