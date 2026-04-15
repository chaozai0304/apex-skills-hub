# Apex Skills Hub

一个正式风格的 Skills Hub 平台，支持：

- 在线上传 Skill ZIP 包
- 超级管理员审批发布
- 公开搜索与详情展示
- 网页下载 ZIP 包
- 通过 `clawhub` 兼容接口直接安装

## 已实现能力

- 首页、搜索页、发布页、管理员登录页、审批控制台、我的技能页、技能详情页
- `/.well-known/clawhub.json` 与 `/.well-known/clawdhub.json`
- `clawhub` 所需核心 API：
	- `/api/v1/search`
	- `/api/v1/skills`
	- `/api/v1/skills/:slug`
	- `/api/v1/skills/:slug/versions`
	- `/api/v1/skills/:slug/versions/:version`
	- `/api/v1/resolve`
	- `/api/v1/download`
- 首次启动自动生成示例技能和存储目录

## 技术选型

- Next.js 16 + App Router
- TypeScript
- Tailwind CSS 4
- PostgreSQL + Prisma（支持初始化、迁移升级与容器化部署）
- `JSZip` + `gray-matter` 用于解析 Skill ZIP 包和 `SKILL.md`

## 环境变量

项目根目录下已提供 `.env` 和 `.env.example`：

- `DATABASE_URL`：PostgreSQL 连接串
- `ADMIN_USERNAME`：管理员用户名
- `ADMIN_PASSWORD`：管理员密码
- `SESSION_SECRET`：管理员 Cookie 签名种子

> 建议上线前替换为真实值。

## 本地运行

```bash
npm install
npm run db:bootstrap
npm run dev
```

启动后访问：

- 首页：`http://localhost:3000`
- 发布页：`http://localhost:3000/publish`
- 控制台：`http://localhost:3000/admin`

## ClawHub 安装方式

部署后可以使用如下命令安装已发布 skill：

```bash
npx clawhub install feature-full-lifecycle --registry http://your-host:3000
```

如果使用内网地址，例如：

```bash
npx clawhub install feature-full-lifecycle --registry http://172.17.189.156:8188
```

## 数据存储说明

- PostgreSQL：技能元数据、审批状态、用户、评分、收藏、日志
- `storage/archives/`：上传和示例 skill 的 ZIP 包归档
- `data/records.json`：仅作为旧版本 JSON 数据导入源（若存在）

其中 `storage/archives/` 和 `data/` 已加入 `.gitignore`，运行时自动生成。

## 数据库初始化与升级

### 首次初始化

```bash
npm install
npm run db:bootstrap
```

它会顺序执行：

1. `prisma generate`
2. `prisma migrate deploy`
3. 若存在 `data/records.json` 且数据库为空，则自动导入旧 JSON 数据

### 后续升级

开发环境生成迁移：

```bash
npm run db:migrate:dev -- --name your_change_name
```

生产环境升级：

```bash
npm run db:migrate:deploy
```

> 推荐把所有结构升级都通过 Prisma migration 管理，不要手工直接改线上表结构。

## Docker / 部署

### Docker Compose 启动

```bash
docker compose up -d --build
```

容器启动时会自动执行：

1. 生成 Prisma Client
2. 执行数据库迁移
3. 尝试导入旧版 `data/records.json`
4. 启动 Next.js 服务

### 一键部署脚本

```bash
sh scripts/deploy.sh
```

该脚本会自动创建本地持久化目录并启动容器。

## 后续建议

- 接入真实用户体系（OIDC / 企业 SSO）
- 为 `SKILL.md` 增加 Markdown 渲染与预览
- 引入对象存储管理大文件与截图资源
- 增加审核日志、评分、收藏和下载审计
