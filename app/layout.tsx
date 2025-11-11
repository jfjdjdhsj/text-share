import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "TextShare — 安全分享文本",
  description: "支持密码、到期时间与查看次数限制的简洁分享工具",
  icons: {
    icon: "/logo.png", // ← 放在 public/logo.png（你的 gaituba.com_crop-round (1).jpg 改名为 logo.png）
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        {/* 设置浏览器标签图标 favicon */}
        <link rel="icon" href="/logo.png" sizes="any" />
      </head>

      <body>
        <div className="container py-10 mx-auto max-w-2xl">
          <header className="mb-8">
            {/* 点击标题回首页 */}
            <Link
              href="/"
              className="text-3xl font-extrabold tracking-tight flex items-center gap-2 hover:opacity-80 transition"
            >
              <img
                src="/logo.png"
                alt="TextShare Logo"
                width={40}
                height={40}
                className="rounded-full"
              />
              <span>TextShare</span>
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
