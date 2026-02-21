<div align="center">
    <h1>Luogu Saver Next (LGS-NG)</h1>
    <p>A web application for saving user-generated content (UGC) from www.luogu.com.cn.</p>
    <p>
        <img src="https://img.shields.io/badge/node-v22.18.0-brightgreen" alt="Node Version"/>
        <img src="https://img.shields.io/github/last-commit/Ark-Aak/luogu-saver-next" alt="Last Commit"/>
        <img src="https://img.shields.io/github/actions/workflow/status/Ark-Aak/luogu-saver-next/deploy.yml" alt="Build Status">
        <img src="https://img.shields.io/github/license/Ark-Aak/luogu-saver-next" alt="License"/>
    </p>
    <p><a href="README.cn.md">简体中文</a> | English</p>
</div>

## Description

**Luogu Saver Next (LGS-NG)** is a web application designed to help users save and manage user-generated content from [Luogu](https://www.luogu.com.cn/), a popular Chinese competitive programming platform. This tool allows users to archive articles, pastes, and other content types, ensuring that valuable information is preserved and remains easily accessible.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Ark-Aak/luogu-saver-next)

## Features

- **Content Archiving:** Save articles and pastes directly from Luogu.
- **Management UI:** User-friendly interface for organizing saved content.
- **Broad Support:** Handles multiple content types efficiently.
- **High Performance:** Utilizes client-side rendering for a smooth user experience.
- **Responsive Design:** Optimized for use on desktops, tablets, and mobile devices.
- **Intelligent Recommendations:** Suggests related content based on user activity.

## Architecture

This project is a **Monorepo** managed by npm workspaces:

- **Root:** Manages shared dev-dependencies (Prettier, TypeScript, etc.) and orchestration.
- **`packages/frontend`:** Vue 3 + Vite application (Naive UI).
- **`packages/backend`:** Koa + TypeScript API service.
- **Infrastructure:** External services (Database, etc.) managed via Docker Compose.

## Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 22.18.0 or higher)
- [Docker](https://www.docker.com/) & Docker Compose (for infrastructure services)

## Infrastructure Setup

Before building or running the application, you need to initialize the underlying infrastructure (e.g., databases). A `docker-compose.yml` is provided in the root directory to spin up these external services.

> **Note:** This Compose file **only** manages external infrastructure. The Node.js application itself is run separately on the host.

Start the infrastructure in the background:

```bash
docker compose up -d
```

## Build Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Ark-Aak/luogu-saver-next.git
cd luogu-saver-next
```

### 2. Install Dependencies

Install dependencies for the root and all workspaces in one go:

```bash
npm install
```

### 3. Build

You can build the entire project (Frontend & Backend) with a single command:

```bash
npm run build
```

Or build them individually using npm workspaces:

**Frontend Only:**

```bash
# Optional: Set environment variables inline
# VITE_API_URL=[https://api.example.com](https://api.example.com) npm run build -w @luogu-saver-next/frontend
npm run build -w @luogu-saver-next/frontend
```

_The compiled static files will be located in `packages/frontend/dist`._

**Backend Only:**

```bash
npm run build -w @luogu-saver-next/backend
```

_The compiled backend files will be located in `packages/backend/dist`._

## Development

We use `concurrently` to run both frontend and backend in watch mode with a single command.

### 1. Start Infrastructure

Ensure your database and other services are running:

```bash
docker compose up -d
```

### 2. Start Development Server

In the project root, run:

```bash
npm run dev
```

This will:

1. Start the **Frontend** (Vite) in watch mode.
2. Start the **Backend** (ts-node-dev) in watch mode.
3. Output logs from both services in the same terminal (color-coded).

## Deployment

### 1. Prepare Infrastructure

On your production server, start the required external services:

```bash
docker compose up -d
```

### 2. Run the Backend Server

Navigate to the backend workspace or run directly from the root:

```bash
cd packages/backend
# Install production dependencies only
npm install --production
# Start the server
node dist/index.js
```

The server will start on the configured port (default is `3000`).

### 3. Serve the Frontend

You need a web server (e.g., **Nginx** or **Caddy**) to serve the static files located in:
`packages/frontend/dist`

### 4. Configuration & Proxying

If you did not set the `VITE_API_URL` variable during the frontend build, the application defaults to sending requests to `/api` on the same domain.

**Crucial Step:** You must configure your web server (Nginx/Caddy) to reverse proxy requests starting with `/api` to the running backend service (e.g., `localhost:3000`).

## Contributing

Contributions are welcome! To contribute to Luogu Saver Next:

1. **Fork** the repository on GitHub.
2. **Create** a new branch for your feature or bug fix.
3. **Commit** your changes with clear, descriptive messages.
4. **Push** your changes to your forked repository.
5. **Open** a Pull Request to the main repository.

Please ensure your code adheres to the project's coding standards (Prettier) and includes appropriate tests.
