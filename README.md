# TextShare

一个**安全 · 简洁 · 可控**的文本/文本文件分享工具。支持密码访问、到期失效、查看次数限制、一次性“阅读后焚毁”，并提供二维码与一键复制链接。

- 仅支持**文本文件**上传（最多 10 个，合计 ≤ 10MB）
- 文本默认 **7 天**后自动删除；附件在上传 **24 小时**后自动清理
- 后端：Next.js App Router + Prisma + Vercel Postgres + Vercel Blob

---

## 一键部署（推荐）

### 第一步：Fork 项目
1. 打开本仓库，点击 **Fork** 到你的 GitHub 账号（保持 `main` 分支）。

### 第二步：在 Vercel 部署
1. 访问 [Vercel](https://vercel.com/)，**Import GitHub Repo**，选择你 Fork 后的 `text-share`。
2. 框架选择 **Next.js**，Root 目录 `./`，直接 **Deploy**（后续再补环境变量）。

### 第三步：创建数据库（Prisma Postgres）
1. 在 Vercel 项目页 → **Storage** → **Prisma Postgres** → **Create**。
2. 创建完成后，点击 **Connect Project** 绑定到你刚部署的项目环境（Development/Preview/Production）。
3. 绑定成功后，Vercel 会自动为项目注入 `DATABASE_URL` 环境变量。

### 第四步：创建 Blob 并配置令牌
1. 在 Vercel 项目页 → **Storage** → **Blob** → **Create**。
2. 创建完成后，点击 **Tokens** 生成一个 **Read-Write Token**。
3. 将令牌添加到项目环境变量：
   - Key：`BLOB_READ_WRITE_TOKEN`
   - Value：`vercel_blob_rw_...`（**不要加引号**）

> 例如：  
> `BLOB_READ_WRITE_TOKEN=vercel_blob_rw_i2SiMkkxmGwbv4Nt_tymi1WNS1KBavcOwa0HEws4234566`

### 第五步：本地运行（可选）
如果你也想在本地开发，复制以下到 `.env.local`：

```env
# Vercel Postgres 连接串（部署后在 Vercel 环境变量里可见，复制到本地用）
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/dbname?sslmode=require

# Vercel Blob RW Token（不要加引号）
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXXXXXXXXXXXXXXXXXXXXXXXXXXX
