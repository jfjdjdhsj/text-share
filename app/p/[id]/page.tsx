"use client";

import { useEffect, useState } from "react";

type Meta = {
  requiresPassword: boolean;
  expired: boolean;
  remainingViews: number | null;
  hasFiles?: boolean;
};

type FileItem = { id: string; filename: string; url: string; size: number };

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export default function PastePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [meta, setMeta] = useState<Meta | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/pastes/${id}`);
      const data = await res.json();
      setMeta(data);
      if (!data.requiresPassword && !data.expired) {
        const res2 = await fetch(`/api/pastes/${id}`, { method: "POST" });
        const d2 = await res2.json();
        if (res2.ok) { setContent(d2.content); setFiles(d2.files || []); }
        else setError(d2.message || "无法读取内容");
      }
    })();
  }, [id]);

  async function unlock() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pastes/${id}/unlock`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "密码错误");
      setContent(data.content);
      setFiles(data.files || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!meta) return <div className="card p-6">加载中…</div>;
  if (meta.expired) return <div className="card p-6 text-red-500">该分享已失效</div>;

  return (
    <main className="card p-6 space-y-4">
      {content ? (
        <div className="space-y-3">
          <div className="text-sm text-slate-500">
            {meta.remainingViews === null ? "不限制查看次数" : `剩余可查看：${meta.remainingViews} 次`}
          </div>
          {content.trim().length > 0 && (
            <pre className="whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              {content}
            </pre>
          )}

          {files.length > 0 && (
            <div className="space-y-2">
              <div className="label">附件（{files.length}）</div>
              <ul className="list-disc pl-5">
                {files.map(f => (
                  <li key={f.id} className="break-all">
                    <a className="underline" href={f.url} target="_blank" rel="noreferrer">
                      {f.filename}
                    </a>{" "}
                    <span className="text-xs text-slate-500">({formatSize(f.size)})</span>
                  </li>
                ))}
              </ul>
              <p className="note">附件会在上传后 24 小时自动清理。</p>
            </div>
          )}
        </div>
      ) : meta.requiresPassword ? (
        <div className="space-y-3">
          <div className="label">该分享已设置访问密码</div>
          <input type="password" className="input" placeholder="输入密码" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button className="btn-primary" onClick={unlock} disabled={loading}>
            {loading ? "验证中…" : "解锁查看"}
          </button>
          {error && <div className="text-sm text-red-500">{error}</div>}
        </div>
      ) : (<div>读取中…</div>)}
    </main>
  );
}
