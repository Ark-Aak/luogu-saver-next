<div align="center">
    <h1>Luogu Saver Next (LGS-NG)</h1>
    <p>A web application for saving user-generated content (UGC) from www.luogu.com.cn.</p>
    <p>
        <img src="https://img.shields.io/badge/node-v22.18.0-brightgreen" alt="Node Version"/>
        <img src="https://img.shields.io/github/last-commit/Ark-Aak/luogu-saver-next" alt="Last Commit"/>
        <img src="https://img.shields.io/github/actions/workflow/status/Ark-Aak/luogu-saver-next/deploy.yml" alt="Build Status">
        <img src="https://img.shields.io/github/license/Ark-Aak/luogu-saver-next" alt="License"/>
    </p>
</div>

## Description

**Luogu Saver Next (LGS-NG)** is a web application designed to help users save and manage user-generated content from [Luogu](https://www.luogu.com.cn/), a popular Chinese competitive programming platform. This tool allows users to archive articles, pastes, and other content types, ensuring that valuable information is preserved and remains easily accessible.

## Features

- **Content Archiving:** Save articles and pastes directly from Luogu.
- **Management UI:** User-friendly interface for organizing saved content.
- **Broad Support:** Handles multiple content types efficiently.
- **High Performance:** Utilizes client-side rendering for a smooth user experience.
- **Responsive Design:** Optimized for use on desktops, tablets, and mobile devices.
- **Intelligent Recommendations:** Suggests related content based on user activity.

## Build Instructions

**Prerequisites:** Ensure you have [Node.js](https://nodejs.org/) (version 22.18.0 or higher) installed.

### 1. Clone the Repository

    git clone https://github.com/Ark-Aak/luogu-saver-next.git
    cd luogu-saver-next

### 2. Build the Frontend

Install dependencies and compile the frontend assets. You can optionally configure the API and CDN URLs using environment variables inline.

    npm install
    # Optional: Set VITE_API_URL and VITE_CDN_URL if needed
    # Example: VITE_API_URL=https://api.example.com npm run build:frontend
    npm run build:frontend

_The compiled static files will be located in the `dist` directory._

### 3. Build the Backend

Navigate to the server directory to install dependencies and compile the backend.

    cd server
    npm install
    npm run build:backend

_The compiled backend files will be located in the `server/dist` directory._

## Deployment

### 1. Run the Backend Server

Start the backend application using Node.js.

    # Inside the /server directory
    node dist/index.js

The server will start on the configured port (default is `3000`).

### 2. Serve the Frontend

You need a web server (e.g., **Nginx** or **Caddy**) to serve the static files from the root `dist` directory.

### 3. Configuration & Proxying

If you did not set the `VITE_API_URL` variable during the frontend build, the application defaults to sending requests to `/api` on the same domain.

**Crucial Step:** You must configure your web server (Nginx/Caddy) to reverse proxy requests starting with `/api` to the running backend service (e.g., `localhost:3000`).

## Development

For development purposes, you can run both the frontend and backend in watch mode.

### 1. Start the Backend in Watch Mode

    cd server
    npm install
    npm run dev:backend

### 2. Start the Frontend in Watch Mode

    cd ..
    npm install
    npm run dev:frontend

Or you can use the combined command:

    npm run dev

The frontend development server will proxy API requests to the backend automatically.

## Contributing

Contributions are welcome! To contribute to Luogu Saver Next:

1. **Fork** the repository on GitHub.
2. **Create** a new branch for your feature or bug fix.
3. **Commit** your changes with clear, descriptive messages.
4. **Push** your changes to your forked repository.
5. **Open** a Pull Request to the main repository.

Please ensure your code adheres to the project's coding standards and includes appropriate tests.
