"use client";

import { useEffect, useState } from "react";

type Meta = {
  requiresPassword: boolean;
  expired: boolean;
  remainingViews: number | null; // null 表示不限制
};

export default function PastePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [meta, setMeta] = useState<Meta | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/pastes/${id}`);
      const data = await res.json();
      setMeta(data);
      if (!data.requiresPassword && !data.expired) {
        // 无密码时直接拉取内容（也会计一次查看）
        const res2 = await fetch(`/api/pastes/${id}`, { method: "POST" });
        const d2 = await res2.json();
        if (res2.ok) setContent(d2.content);
        else setError(d2.message || "无法读取内容");
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
      // 成功读取也会 +1 次查看
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
        <div className="space-y-2">
          <div className="text-sm text-slate-500">
            {meta.remainingViews === null ? "不限制查看次数" : `剩余可查看：${meta.remainingViews} 次`}
          </div>
          <pre className="whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            {content}
          </pre>
        </div>
      ) : meta.requiresPassword ? (
        <div className="space-y-3">
          <div className="label">该分享已设置访问密码</div>
          <input
            type="password"
            className="input"
            placeholder="输入密码"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <button className="btn-primary" onClick={unlock} disabled={loading}>
            {loading ? "验证中…" : "解锁查看"}
          </button>
          {error && <div className="text-sm text-red-500">{error}</div>}
        </div>
      ) : (
        <div>读取中…</div>
      )}
    </main>
  );
}
