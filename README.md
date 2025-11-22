# TextShare

一个 **安全 · 简洁 · 可控** 的文本/文本文件分享工具。支持密码访问、到期失效、查看次数限制、一次性"阅读后焚毁"，生成可分享链接与二维码。  
> 仅支持**文本文件**上传（最多 10 个，总计 ≤ 10MB）。文本默认保存 **7 天** 后自动删除；附件在上传 **24 小时** 后自动清理。

---

## 功能亮点

- 🔒 可选密码访问（长度不做强制限制，1 位也可）
- ⏱️ 可选有效期（分钟）；不设置时文本默认 7 天到期
- 👀 可选查看次数限制（达到次数后自动失效）
- 🔥 阅读后焚毁（一次打开即失效）
- 📄 上传**文本文件**（.txt / .md / .json / .csv / .log / …），最多 10 个，总计 ≤ 10MB
- 🔗 一键复制链接 + 二维码
- 🧹 定时清理（附件 24h、文本到期后自动清理）

---

## 部署方式

### 方式一：Vercel 部署

#### 第一步：Fork 项目
1. 打开本仓库，点击 **Fork** 到你自己的 GitHub 账号

#### 第二步：导入到 Vercel 并首次部署
1. 登录 [Vercel](https://vercel.com/) → 点击 **New Project** → **Import Git Repository**。
2. 选择你 Fork 之后的仓库 `text-share`，点击 **Deploy**（此时先完成一次构建，稍后再补齐存储与变量）。

> **说明**  
> 首次部署若因为缺少数据库/环境变量失败，不要紧，继续下面的步骤后再 **Redeploy** 即可。

#### 第三步：创建数据库（Prisma Postgres）
1. 在 Vercel 控制台左侧选择 **Storage** → **Prisma Postgres** → **Create**。
2. 创建完成后，点击 **Connect Project**，选择你的项目（如 `text-share`），勾选 `Preview` & `Production` 环境并确认。
3. 连接成功后，Vercel 会自动为项目注入 `DATABASE_URL` 环境变量（不用手动复制）。

#### 第四步：创建 Blob 存储并配置 Token
1. 在 Vercel 控制台左侧选择 **Storage** → **Blob** → **Create**。
2. 选择你的项目（如 `text-share`），勾选 `Preview` & `Production` 环境并确认创建。
3. 在 Blob 页面点击 **Tokens** → 生成 **Read/Write Token**（RW Token）。
4. 打开 **Project → Settings → Environment Variables**，新增：
   - **Name**：`BLOB_READ_WRITE_TOKEN`  
   - **Value**：将生成的 Token 粘贴过来，例如：
     ```
     vercel_blob_rw_i2SiMkkxmGwbv4Nt_tymi1WNS1KBavcOwa0HEws4234566
     ```
     > **注意：值不要带引号**（不要写成 `"vercel_blob_rw_..."`）。
   - **Environment**：勾选 `Preview` & `Production`  
   - 保存后回到 **Deployments**，点击 **Redeploy** 让变量生效。

#### 第五步：二次部署与验收
1. 变量与存储配置好后，**Redeploy** 项目。
2. 访问你的站点首页，测试：
   - 仅文本创建分享；
   - 上传**文本文件**（非文本会提示"仅支持文本文件"）；
   - 设置密码/时间/查看次数/阅读后焚毁等；
   - 复制链接、扫码二维码访问。
