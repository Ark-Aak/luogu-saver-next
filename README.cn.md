<div align="center">
    <h1>Luogu Saver Next (LGS-NG)</h1>
    <p>一个用于保存来自 www.luogu.com.cn 的用户生成内容 (UGC) 的 Web 应用程序。</p>
    <p>
        <img src="https://img.shields.io/badge/node-v22.18.0-brightgreen" alt="Node 版本"/>
        <img src="https://img.shields.io/github/last-commit/Ark-Aak/luogu-saver-next" alt="最后提交"/>
        <img src="https://img.shields.io/github/actions/workflow/status/Ark-Aak/luogu-saver-next/deploy.yml" alt="构建状态">
        <img src="https://img.shields.io/github/license/Ark-Aak/luogu-saver-next" alt="许可证"/>
    </p>
    <p>简体中文 | <a href="README.md">English</a></p>
</div>

## 项目描述

**Luogu Saver Next (LGS-NG)** 是一个 Web 应用程序，旨在帮助用户保存和管理来自 [洛谷](https://www.luogu.com.cn/)（一个流行的中文算法竞赛平台）的用户生成内容。该工具允许用户存档文章、剪贴板内容和其他类型的内容，确保有价值的信息得以保存并易于访问。

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Ark-Aak/luogu-saver-next)

## 功能特性

- **内容存档：** 直接从洛谷保存文章和剪贴板内容。
- **管理界面：** 用户友好的界面，用于组织已保存的内容。
- **广泛支持：** 高效处理多种内容类型。
- **高性能：** 利用客户端渲染提供流畅的用户体验。
- **响应式设计：** 针对桌面、平板和移动设备进行优化。
- **智能推荐：** 根据用户活动推荐相关内容。

## 架构

本项目是一个由 npm workspaces 管理的 **Monorepo**：

- **根目录：** 管理共享的开发依赖（Prettier、TypeScript 等）和编排。
- **`packages/frontend`：** Vue 3 + Vite 应用程序（Naive UI）。
- **`packages/backend`：** Koa + TypeScript API 服务。
- **基础设施：** 外部服务（数据库等）通过 Docker Compose 管理。

## 前置要求

确保已安装以下软件：

- [Node.js](https://nodejs.org/)（版本 22.18.0 或更高）
- [Docker](https://www.docker.com/) 和 Docker Compose（用于基础设施服务）

## 基础设施设置

在构建或运行应用程序之前，需要初始化底层基础设施（例如数据库）。根目录中提供了一个 `docker-compose.yml` 文件来启动这些外部服务。

> **注意：** 此 Compose 文件 **仅** 管理外部基础设施。Node.js 应用程序本身在主机上单独运行。

在后台启动基础设施：

```bash
docker compose up -d
```

## 构建说明

### 1. 克隆仓库

```bash
git clone https://github.com/Ark-Aak/luogu-saver-next.git
cd luogu-saver-next
```

### 2. 安装依赖

一次性安装根目录和所有工作区的依赖：

```bash
npm install
```

### 3. 构建

可以使用单个命令构建整个项目（前端和后端）：

```bash
npm run build
```

或者使用 npm workspaces 分别构建：

**仅构建前端：**

```bash
# 可选：内联设置环境变量
# VITE_API_URL=https://api.example.com npm run build -w @luogu-saver-next/frontend
npm run build -w @luogu-saver-next/frontend
```

_编译后的静态文件将位于 `packages/frontend/dist` 目录中。_

**仅构建后端：**

```bash
npm run build -w @luogu-saver-next/backend
```

_编译后的后端文件将位于 `packages/backend/dist` 目录中。_

## 开发

我们使用 `concurrently` 通过单个命令在监视模式下同时运行前端和后端。

### 1. 启动基础设施

确保数据库和其他服务正在运行：

```bash
docker compose up -d
```

### 2. 启动开发服务器

在项目根目录中运行：

```bash
npm run dev
```

这将：

1. 在监视模式下启动 **前端**（Vite）。
2. 在监视模式下启动 **后端**（ts-node-dev）。
3. 在同一终端中输出两个服务的日志（颜色编码）。

## 部署

### 1. 准备基础设施

在生产服务器上，启动所需的外部服务：

```bash
docker compose up -d
```

### 2. 运行后端服务器

导航到后端工作区或直接从根目录运行：

```bash
cd packages/backend
# 仅安装生产依赖
npm install --production
# 启动服务器
node dist/index.js
```

服务器将在配置的端口（默认为 `3000`）上启动。

### 3. 提供前端服务

需要一个 Web 服务器（例如 **Nginx** 或 **Caddy**）来提供位于以下目录的静态文件：
`packages/frontend/dist`

### 4. 配置与代理

如果在构建前端时未设置 `VITE_API_URL` 变量，应用程序默认将请求发送到同一域名的 `/api`。

**关键步骤：** 必须配置 Web 服务器（Nginx/Caddy）将以 `/api` 开头的请求反向代理到正在运行的后端服务（例如 `localhost:3000`）。

## 贡献

欢迎贡献！要为 Luogu Saver Next 做出贡献：

1. **Fork** GitHub 上的仓库。
2. **创建** 一个新的分支用于你的功能或错误修复。
3. **提交** 你的更改，并附上清晰、描述性的提交信息。
4. **推送** 你的更改到你的 fork 仓库。
5. **打开** 一个 Pull Request 到主仓库。

请确保你的代码符合项目的编码标准（Prettier）并包含适当的测试。
