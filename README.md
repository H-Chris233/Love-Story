# Love Story

一个部署只服务一对伴侣的私密爱情纪念簿。它保留恋爱计时、回忆时间线、照片相册、纪念日和双人账号，并允许把指定内容发布到始终 `noindex` 的访客故事页。

## 架构

- Vue 3、Vite、Pinia、Vue Router 构成前端；客户端只使用原生 `fetch` 和 Cookie 会话。
- `api/index.ts` 是唯一 Vercel Function，使用标准 Web Request/Response；`lib/api.ts` 分派原有 API URL，业务规则位于 `lib/auth.ts`、`lib/story.ts`、`lib/media.ts` 和 `lib/reminders.ts`。
- Neon PostgreSQL + Drizzle 保存空间、成员、会话、邀请、回忆、纪念日及提醒投递记录。
- Vercel Blob 以私有模式保存图片；浏览器只能通过 `/api/media/:id` 在内容可见性鉴权后读取。
- Resend 发送邀请、密码重置和纪念日邮件。Vercel Cron 每天 UTC 23:00（北京时间 07:00）调用提醒任务。

数据模型通过数据库约束保证只有一个空间、每个空间只有位置 1 和 2 两位成员。成员权力平等；作者字段只用于留痕。回忆和纪念日默认私密，照片继承所属回忆的可见性。

账号拥有独立用户名和公开昵称。初始化与接受邀请时用户名、邮箱均必填；用户名为 3–32 位字母、数字或下划线，统一小写且唯一，登录支持用户名或邮箱加密码。受邀邮箱必须与邀请一致。旧账号迁移后用户名暂为空，仍可用邮箱登录并在设置中补设；用户名不出现在公开故事 DTO 中。

## 安全边界

- 会话、邀请和密码重置均使用随机不透明令牌，数据库只保存 SHA-256 哈希。
- 会话 Cookie 为 `HttpOnly; Secure; SameSite=Lax`，有效期 30 天；邀请有效 7 天；密码重置有效 1 小时。
- 所有浏览器写请求必须携带与 `APP_ORIGIN` 完全一致的 `Origin`。
- 忘记密码不会暴露邮箱是否存在；私密内容和未授权媒体均返回 404。
- 图片在服务端校验实际文件签名，只接受 JPEG、PNG、WebP、GIF；单张最多 5 MB，每条回忆最多 10 张，拒绝 SVG。
- 纪念日投递同时使用数据库唯一记录与 Resend 幂等键，防止定时任务重试造成重复邮件。
- 登录按来源地址（20 次/15 分钟）和规范化邮箱（10 次/15 分钟）限流；找回密码为邮箱 3 次/小时，邮件接口共享来源地址 10 次/小时，邀请另按成员 3 次/小时限制。计数保存在 PostgreSQL，标识先哈希，超限统一返回 429 和 `Retry-After`。生产仅信任 Vercel 提供的来源地址；数据库不可用时不会绕过限流。
- 删除照片/回忆时，数据库事务同时移除内容并保存 Blob 清理任务；失败会回滚。Blob 暂不可用不影响已经完成的逻辑删除，任务保留并由原 Cron 及后续删除请求重试。照片从逻辑删除后立即不可访问。
- 提醒邮件内容与幂等键持久保存，`sending` 租约 10 分钟后可重新领取，旧进程不能覆盖新租约结果。Resend 幂等键有效 24 小时，因此只允许首次发送后 23 小时内自动重放；超窗或历史记录缺少快照时，Cron 返回 `needsReview` 数量，需人工核对，绝不盲目重发。原 Cron 仍每日运行，故当天恢复需使用 `CRON_SECRET` 手动重新调用；未配置额外高频调度。

历史 `.env.example` 曾包含疑似真实的 MongoDB 连接凭据。该值已从仓库删除，但删除不能撤销泄露；部署负责人必须在原 MongoDB 服务端立即轮换或撤销该凭据。重构不会连接或删除旧数据库。

## 本地开发

要求 Node.js 22 和 pnpm 10。

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

仅运行 Vite 时，`/api` 会代理到 `API_TARGET`（默认 `http://localhost:3000`）。需要同时运行 Vercel Functions 时，使用 Vercel CLI 的 `vercel dev`。`APP_ORIGIN` 必须与浏览器访问的完整来源一致。运行迁移时必须将 `DATABASE_URL` 导出到进程环境；Drizzle 配置不会自动读取 `.env.local`。

`vercel.json` 先将 `/api/:path*` 转发到单个 Function，再让页面深链接回退到 `index.html`。邀请、重置、公开详情和私密页面可以直接打开；未知 API 仍返回 JSON 404。

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

真实 PostgreSQL 集成测试由 `pnpm test:integration` 单独运行。将 `TEST_DATABASE_URL` 指向本机隔离 PostgreSQL 16（要求能创建数据库）；测试只接受 localhost/127.0.0.1，自动创建随机名称测试库、运行全部迁移并在结束时删除它。不要填生产数据库。测试覆盖初始化/邀请竞争、双人约束、并发照片上限、删除事务失败回滚、跨实例限流及提醒租约隔离。GitHub Actions 自动提供 PostgreSQL service 并运行这项检查；普通 `pnpm run ci` 不依赖本机数据库。

本轮新增迁移包含 `blob_deletions`、`rate_limits` 及投递快照/租约字段。部署前必须运行 `pnpm db:migrate`。Cron 结果的 `failed`、`needsReview` 与 `cleanup.failed` 非零时，应排查邮件、数据库或 Blob 服务；它们不会包含邮箱或令牌。旧已发送投递不重发；旧未完成且无快照的投递保留待核查。

Vitest 覆盖认证、PATCH 字段白名单、隐私过滤、媒体签名/大小/数量限制与失败补偿、北京时间与提醒幂等、真实 Handler HTTP 契约和关键 Vue 交互。Playwright 在桌面和移动视口通过同一个真实 Handler 完成双人邀请、编辑、照片补传/删除、公开/私密隔离、密码重置及 Cron 重复调用。测试只替换数据库、Blob 和邮件适配器，不伪造业务 API；测试邮箱可由进程直接读取，无生产测试端点。

浏览器测试使用 Vite 的页面回退和测试桥接器，并不证明 Vercel rewrite、Neon 事务或真实 Blob/Resend 可用；这些必须在部署冒烟中验证。CI 按上述顺序执行并使用冻结锁文件。一次性生产依赖审计命令为 `pnpm audit --prod --registry=https://registry.npmjs.org`，不将随外部公告变化的审计结果作为 CI 门禁。

## 部署准备

1. 在 Neon 创建数据库并运行 `pnpm db:migrate`。
2. 在 Vercel 创建私有 Blob Store，配置六个必需环境变量。
3. 在 Resend 验证发信域名，确保 `EMAIL_FROM` 属于已验证域名。
4. 为 Cron 配置 `CRON_SECRET`，确认 `/api/cron/reminders` 的 Authorization 验证通过。
5. 部署后分别验证初始化并发保护、两位成员登录、私密/公开媒体、邀请与重置邮件、提醒任务重复调用。
6. 验证 `/invite/...`、`/reset-password/...`、`/story/...`、`/app/...` 的直接访问，以及部署产物只有一个 Function。先验证 Preview，再发布 Production。

仓库命令不会自动创建云资源、部署应用或删除任何旧远程数据。
