"use client";

import { useEffect, useState } from "react";

type MetaOrData = {
  requiresPassword: boolean;
  expired: boolean;
  remainingViews: number | null;
  hasFiles?: boolean;
  content?: string;
  files?: { id: string; filename: string; url: string; size: number }[];
};

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export default function PastePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [meta, setMeta] = useState<MetaOrData | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [files, setFiles] = useState<MetaOrData["files"]>([]);
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/pastes/${id}`, { cache: "no-store" });
      const data: MetaOrData = await res.json();
      setMeta(data);
      if (res.ok && !data.requiresPassword && !data.expired) {
        setContent(data.content || "");
        setFiles(data.files || []);
      } else if (!res.ok) {
        setError(data as any);
      }
    })();
  }, [id]);

  async function unlock() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pastes/${id}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "密码错误");
      setContent(data.content);
      setFiles(data.files || []);
      // 同步剩余次数（后端已+1）
      setMeta((m) => (m ? { ...m, requiresPassword: false, expired: false, remainingViews: data.remainingViews ?? null } : m));
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
      {!meta.requiresPassword ? (
        <div className="space-y-3">
          <div className="text-sm text-slate-500">
            {meta.remainingViews === null ? "不限制查看次数" : `剩余可查看：${meta.remainingViews} 次`}
          </div>

          {content && content.trim().length > 0 && (
            <pre className="whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              {content}
            </pre>
          )}

          {files && files.length > 0 && (
            <div className="space-y-2">
              <div className="label">附件（{files.length}）</div>
              <ul className="pl-0 space-y-2">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 flex-wrap">
                    <a className="underline break-all" href={f.url} target="_blank" rel="noreferrer">
                      {f.filename}
                    </a>
                    <span className="text-xs text-slate-500">({formatSize(f.size)})</span>
                    <a
                      className="text-xs px-2 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      href={`/api/uploads/${f.id}/download`}
                    >
                      下载
                    </a>
                  </li>
                ))}
              </ul>
              <p className="note">文本默认 7 天后删除；附件在上传后 24 小时自动清理。</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="label">该分享已设置访问密码</div>
          <input type="password" className="input" placeholder="输入密码" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button className="btn-primary" onClick={unlock} disabled={loading}>
            {loading ? "验证中…" : "解锁查看"}
          </button>
          {error && <div className="text-sm text-red-500">{error}</div>}
        </div>
      )}
    </main>
  );
}
