import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "TextShare — 安全分享文本",
  description: "支持密码、到期时间与查看次数限制的简洁分享工具",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="container py-10">
          <header className="mb-8">
            {/* 点击标题回首页 */}
            <Link
              href="/"
              className="text-3xl font-extrabold tracking-tight hover:opacity-80 transition"
            >
              TextShare
            </Link>
            <p className="text-slate-500 mt-1">安全 · 简洁 · 可控</p>
          </header>

          {children}

          <footer className="mt-12 text-center text-sm text-slate-500">
            © {new Date().getFullYear()}{" "}
            <a
              href="https://github.com/jfjdjdhsj/text-share"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-700 dark:hover:text-slate-300 transition"
            >
              TextShare
            </a>
          </footer>
        </div>
      </body>
    </html>
  );
}
