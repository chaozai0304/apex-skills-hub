# Apex Skills Hub

[中文](#中文说明) | [English](#english)

---

## 中文说明

### 项目简介

`Apex Skills Hub` 是一个面向团队内部知识沉淀与技能分发的 Skills Registry 平台，支持作者在线上传技能 ZIP 包、管理员审核发布、用户搜索与浏览技能详情，并通过兼容 `ClawHub` 的 registry 接口直接安装技能。

适合的场景包括：

- 企业内部 skill / prompt / workflow 资产管理
- AI 能力包、模板、脚本、规范文档的统一发布
- 团队可复用知识资产的审核、沉淀与分发

### 当前能力

#### 产品功能

- 在线上传 Skill ZIP 包
- 超级管理员审批、发布、删除技能
- 用户登录、收藏、评分、我的技能工作台
- 首页、搜索页、排行榜、技能详情页、版本页、文件浏览页
- 技能版本管理与“提交新版本”流程
- 管理端用户管理、审批日志、技能列表分页与搜索

#### Registry / API 能力

- `/.well-known/clawhub.json`
- `/.well-known/clawdhub.json`
- `/api/v1/search`
- `/api/v1/skills`
- `/api/v1/skills/:slug`
- `/api/v1/skills/:slug/versions`
- `/api/v1/skills/:slug/versions/:version`
- `/api/v1/resolve`
- `/api/v1/download`

#### 体验增强

- ZIP 包自动规范化（去掉多余顶层目录）
- `SKILL.md` Markdown 渲染
- 首页、详情页、搜索页等核心页面支持中英文切换
- Header 内置语言切换开关（通过 Cookie 持久化当前语言）

### 技术栈

- Next.js 16 + App Router
- TypeScript
- Tailwind CSS 4
- PostgreSQL + Prisma
- JSZip + gray-matter
- react-markdown + remark-gfm

### 项目结构概览

```text
src/
  app/                  # App Router 页面与 API
  components/           # 共享组件
  lib/                  # 数据、认证、registry、i18n、工具函数
prisma/                 # Prisma schema 与迁移
scripts/                # 数据库初始化 / 导入 / 部署脚本
docker/                 # Docker entrypoint
public/                 # 静态资源
```

### 环境变量

项目根目录提供 `.env.example`，常用变量包括：

- `DATABASE_URL`：PostgreSQL 连接串
- `ADMIN_USERNAME`：管理员用户名
- `ADMIN_PASSWORD`：管理员密码
- `SESSION_SECRET`：会话签名密钥
- `COOKIE_SECURE`：可选，控制 Cookie 是否强制 `Secure`

> 建议生产环境使用真实强密码、随机 `SESSION_SECRET`，并通过安全的方式注入环境变量。

### 本地开发

#### 1. 安装依赖

```bash
npm install
```

#### 2. 配置环境变量

```bash
cp .env.example .env
```

然后按你的数据库信息修改 `.env`。

#### 3. 初始化数据库

```bash
npm run db:bootstrap
```

它会自动：

1. 生成 Prisma Client
2. 执行数据库迁移
3. 如果检测到旧版 `data/records.json` 且数据库为空，则自动导入历史数据

#### 4. 启动开发服务

```bash
npm run dev
```

默认访问地址：

- 首页：`http://localhost:3000`
- 发布页：`http://localhost:3000/publish`
- 搜索页：`http://localhost:3000/search`
- 管理员登录：`http://localhost:3000/admin/login`

### 多语言切换

当前版本已提供基础中英文切换能力：

- Header 中可直接切换 `中文 / EN`
- 通过 Cookie 记住当前语言偏好
- 核心公共页面和用户主流程支持双语展示

当前已重点覆盖：

- 全局导航与页脚
- 首页
- 搜索页
- 发布页与发布表单
- 用户登录 / 管理员登录
- 排行榜
- 我的技能
- 技能详情页

> 后台审批控制台中的深层运营文案仍以中文为主，后续可以继续扩展为完整后台 i18n。

### ClawHub 安装方式

部署后可以使用：

```bash
npx clawhub install feature-full-lifecycle --registry http://your-host:3000
```

例如在内网环境：

```bash
npx clawhub install feature-full-lifecycle --registry http://172.17.1.2:8188
```

如果某个 `slug` 有多个已发布版本，未显式指定版本号时，CLI 会默认安装该技能的最新发布版本。

### 数据存储说明

- PostgreSQL：技能元数据、审批状态、用户、评分、收藏、日志
- `storage/archives/`：上传与示例技能的 ZIP 包归档
- `data/records.json`：仅作为旧版 JSON 数据导入源（如果存在）

其中 `storage/archives/`、`data/` 和 `.env*` 已在 `.gitignore` 中处理，不会默认提交到仓库。

### 数据库迁移

开发环境创建新迁移：

```bash
npm run db:migrate:dev -- --name your_change_name
```

生产环境执行迁移：

```bash
npm run db:migrate:deploy
```

建议所有表结构升级都通过 Prisma Migration 管理，不要直接手工修改线上表结构。

### Docker / 部署

#### Docker Compose

```bash
docker compose up -d --build
```

容器启动时会自动执行：

1. Prisma Client 生成
2. 数据库迁移
3. 可选的旧数据导入
4. 启动 Next.js 服务

#### 部署脚本

```bash
sh scripts/deploy.sh
```

该脚本会创建本地持久化目录并启动容器。

### 推荐后续增强

- 接入企业 SSO / OIDC
- 为后台控制台补全完整中英文国际化
- 引入对象存储管理大文件、截图和富媒体资源
- 增加更细粒度的审计、权限与操作日志
- 提供公开 API 文档与 SDK 示例

---

## English

### Overview

`Apex Skills Hub` is an internal Skills Registry platform for publishing, reviewing, discovering, and installing reusable team skills. It allows authors to upload skill ZIP packages, administrators to review and publish them, and users to browse, favorite, rate, download, or install skills through a `ClawHub`-compatible registry API.

It is well suited for:

- Internal skill / prompt / workflow distribution
- Reusable AI capability packages, scripts, templates, and standards
- Governed publishing and long-term knowledge accumulation inside teams

### What is implemented

#### Product capabilities

- Web-based skill ZIP uploads
- Super-admin review, publish, and delete workflows
- User login, favorites, ratings, and personal workspace
- Homepage, search, leaderboard, skill detail, version, and file browser views
- Versioned skill publishing with “submit new version” support
- Admin-side user management, review logs, skill listing, pagination, and search

#### Registry / API support

- `/.well-known/clawhub.json`
- `/.well-known/clawdhub.json`
- `/api/v1/search`
- `/api/v1/skills`
- `/api/v1/skills/:slug`
- `/api/v1/skills/:slug/versions`
- `/api/v1/skills/:slug/versions/:version`
- `/api/v1/resolve`
- `/api/v1/download`

#### UX improvements

- Automatic ZIP normalization (removes unnecessary top-level folders)
- Markdown rendering for `SKILL.md`
- Chinese / English switching on core public pages
- Header locale switcher with cookie-based persistence

### Tech stack

- Next.js 16 + App Router
- TypeScript
- Tailwind CSS 4
- PostgreSQL + Prisma
- JSZip + gray-matter
- react-markdown + remark-gfm

### Project structure

```text
src/
  app/                  # App Router pages and API routes
  components/           # Shared UI components
  lib/                  # Data, auth, registry, i18n, and utility logic
prisma/                 # Prisma schema and migrations
scripts/                # Bootstrap / import / deploy scripts
docker/                 # Docker entrypoint
public/                 # Static assets
```

### Environment variables

The repository includes `.env.example`. Common variables include:

- `DATABASE_URL`: PostgreSQL connection string
- `ADMIN_USERNAME`: admin username
- `ADMIN_PASSWORD`: admin password
- `SESSION_SECRET`: session signing secret
- `COOKIE_SECURE`: optional override for secure-cookie behavior

> In production, always use a strong random `SESSION_SECRET` and inject real secrets securely.

### Local development

#### 1. Install dependencies

```bash
npm install
```

#### 2. Create your environment file

```bash
cp .env.example .env
```

Then update `.env` with your actual database settings.

#### 3. Bootstrap the database

```bash
npm run db:bootstrap
```

This will automatically:

1. Generate Prisma Client
2. Apply database migrations
3. Import legacy JSON data if `data/records.json` exists and the database is still empty

#### 4. Start the dev server

```bash
npm run dev
```

Default entry points:

- Home: `http://localhost:3000`
- Publish: `http://localhost:3000/publish`
- Search: `http://localhost:3000/search`
- Admin login: `http://localhost:3000/admin/login`

### Localization

The project now includes a basic Chinese / English switching system:

- A `中文 / EN` switcher in the header
- Cookie-based locale persistence
- Bilingual support across the core public product journey

The current coverage focuses on:

- Global navigation and footer
- Home page
- Search page
- Publish page and publish form
- User / admin login pages
- Leaderboard
- My Skills
- Skill detail page

> The deeper operational copy inside the admin review console is still primarily Chinese for now, and can be internationalized further in a future pass.

### Installing via ClawHub

After deployment, you can install a published skill with:

```bash
npx clawhub install feature-full-lifecycle --registry http://your-host:3000
```

For example, on an internal network:

```bash
npx clawhub install feature-full-lifecycle --registry http://172.17.1.2:8188
```

If multiple published versions exist under the same `slug`, the CLI resolves to the latest published version by default when no explicit version is provided.

### Data storage

- PostgreSQL: skill metadata, review state, users, ratings, favorites, logs
- `storage/archives/`: archived uploaded and seeded skill ZIPs
- `data/records.json`: legacy JSON import source only (if present)

`storage/archives/`, `data/`, and `.env*` are ignored by Git and are expected to be generated or managed outside source control.

### Database migrations

Create a new migration in development:

```bash
npm run db:migrate:dev -- --name your_change_name
```

Apply migrations in production:

```bash
npm run db:migrate:deploy
```

It is strongly recommended to manage all schema changes through Prisma Migrations rather than editing production tables manually.

### Docker / deployment

#### Docker Compose

```bash
docker compose up -d --build
```

Container startup will automatically:

1. Generate Prisma Client
2. Apply migrations
3. Optionally import legacy JSON data
4. Start the Next.js server

#### Deployment script

```bash
sh scripts/deploy.sh
```

This script prepares local persistence directories and starts the containers.

### Suggested future improvements

- Integrate enterprise SSO / OIDC
- Extend full localization support into the admin console
- Add object storage for large files, screenshots, and media assets
- Introduce finer-grained permissions, audits, and review logs
- Publish formal API documentation and SDK examples
