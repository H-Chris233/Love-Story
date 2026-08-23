# Love Story

一个部署只服务一对伴侣的私密爱情纪念簿。它保留恋爱计时、回忆时间线、照片相册、纪念日和双人账号，并允许把指定内容发布到始终 `noindex` 的访客故事页。

## 架构

- Vue 3、Vite、Pinia、Vue Router 构成前端；客户端只使用原生 `fetch` 和 Cookie 会话。
- `api/` 是薄 Vercel Functions 适配层，业务规则位于 `lib/auth.ts`、`lib/story.ts`、`lib/media.ts` 和 `lib/reminders.ts`。
- Neon PostgreSQL + Drizzle 保存空间、成员、会话、邀请、回忆、纪念日及提醒投递记录。
- Vercel Blob 以私有模式保存图片；浏览器只能通过 `/api/media/:id` 在内容可见性鉴权后读取。
- Resend 发送邀请、密码重置和纪念日邮件。Vercel Cron 每天 UTC 23:00（北京时间 07:00）调用提醒任务。

数据模型通过数据库约束保证只有一个空间、每个空间只有位置 1 和 2 两位成员。成员权力平等；作者字段只用于留痕。回忆和纪念日默认私密，照片继承所属回忆的可见性。

## 安全边界

- 会话、邀请和密码重置均使用随机不透明令牌，数据库只保存 SHA-256 哈希。
- 会话 Cookie 为 `HttpOnly; Secure; SameSite=Lax`，有效期 30 天；邀请有效 7 天；密码重置有效 1 小时。
- 所有浏览器写请求必须携带与 `APP_ORIGIN` 完全一致的 `Origin`。
- 忘记密码不会暴露邮箱是否存在；私密内容和未授权媒体均返回 404。
- 图片在服务端校验实际文件签名，只接受 JPEG、PNG、WebP、GIF；单张最多 5 MB，每条回忆最多 10 张，拒绝 SVG。
- 纪念日投递同时使用数据库唯一记录与 Resend 幂等键，防止定时任务重试造成重复邮件。

历史 `.env.example` 曾包含疑似真实的 MongoDB 连接凭据。该值已从仓库删除，但删除不能撤销泄露；部署负责人必须在原 MongoDB 服务端立即轮换或撤销该凭据。重构不会连接或删除旧数据库。

## 本地开发

要求 Node.js 22 和 pnpm 10。

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

仅运行 Vite 时，`/api` 会代理到 `API_TARGET`（默认 `http://localhost:3000`）。需要同时运行 Vercel Functions 时，使用 Vercel CLI 的 `vercel dev --listen 3000`，再运行 Vite；也可以直接由 `vercel dev` 托管前端和函数。

必需环境变量只有：

- `DATABASE_URL`
- `BLOB_READ_WRITE_TOKEN`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `APP_ORIGIN`
- `CRON_SECRET`

任何变量缺失都会显式失败，不提供生产密钥回退。数据库结构位于 `db/schema.ts`，首个迁移位于 `drizzle/`。

## API 契约

成功响应统一为：

```json
{ "data": {} }
```

删除、退出和密码重置等无内容操作返回 `204`。错误统一为：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请完整填写必填信息",
    "fields": { "title": "此项为必填项" }
  }
}
```

对外 ID 均为字符串，日期使用 ISO 字符串或 `YYYY-MM-DD` 日历日期；公开 DTO 不包含邮箱、令牌、密码哈希或 Blob 内部地址。

## 质量门禁

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm build-only
pnpm test:e2e
```

Vitest 覆盖认证、隐私过滤、媒体签名/鉴权、北京时间与提醒幂等、HTTP 契约和关键 Vue 交互。Playwright 在桌面和移动视口覆盖初始化、私密内容创建、公开提示、取消公开及匿名页面隔离。CI 按上述顺序执行并使用冻结锁文件。

## 部署准备

1. 在 Neon 创建数据库并运行 `pnpm db:migrate`。
2. 在 Vercel 创建私有 Blob Store，配置六个必需环境变量。
3. 在 Resend 验证发信域名，确保 `EMAIL_FROM` 属于已验证域名。
4. 为 Cron 配置 `CRON_SECRET`，确认 `/api/cron/reminders` 的 Authorization 验证通过。
5. 部署后分别验证初始化并发保护、两位成员登录、私密/公开媒体、邀请与重置邮件、提醒任务重复调用。

仓库命令不会自动创建云资源、部署应用或删除任何旧远程数据。
