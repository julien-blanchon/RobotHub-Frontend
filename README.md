---
title: LeRobot Arena Frontend
emoji: 🤖
colorFrom: blue
colorTo: purple
sdk: static
app_build_command: bun install && bun run build
app_file: build/index.html
pinned: false
license: mit
short_description: A web-based robotics control and simulation platform
tags:
  - robotics
  - control
  - simulation
  - svelte
  - static
  - frontend
---

# 🤖 LeRobot Arena

A web-based robotics control and simulation platform that bridges digital twins and physical robots. Built with Svelte for the frontend and FastAPI for the backend.

## 🚀 Simple Deployment Options

Here are the easiest ways to deploy this Svelte frontend:

### 🏆 Option 1: Hugging Face Spaces (Static) - RECOMMENDED ✨

**Automatic deployment** (easiest):
1. **Fork this repository** to your GitHub account
2. **Create a new Space** on [Hugging Face Spaces](https://huggingface.co/spaces)
3. **Connect your GitHub repo** - it will auto-detect the static SDK
4. **Push to main branch** - auto-builds and deploys!

The frontmatter is already configured with:
```yaml
sdk: static
app_build_command: bun install && bun run build
app_file: build/index.html
```

**Manual upload**:
1. Run `bun install && bun run build` locally
2. Create a Space with "Static HTML" SDK
3. Upload all files from `build/` folder

### 🚀 Option 2: Vercel - One-Click Deploy

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new)

Settings: Build command `bun run build`, Output directory `build`

### 📁 Option 3: Netlify - Drag & Drop

1. Build locally: `bun install && bun run build`
2. Drag `build/` folder to [Netlify](https://netlify.com)

### 🆓 Option 4: GitHub Pages

Add this workflow file (`.github/workflows/deploy.yml`):
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./build
```

### 🐳 Option 5: Docker (Optional)

For local development or custom hosting:
```bash
docker build -t lerobot-arena-frontend .
docker run -p 7860:7860 lerobot-arena-frontend
```

The Docker setup uses Bun's simple static server - much simpler than the complex server.js approach!

## 🛠️ Development Setup

For local development with hot-reload capabilities:

### Frontend Development

```bash
# Install dependencies
bun install

# Start the development server
bun run dev

# Or open in browser automatically
bun run dev -- --open
```

### Backend Development

```bash
# Navigate to Python backend
cd src-python

# Install Python dependencies (using uv)
uv sync

# Or using pip
pip install -e .

# Start the backend server
python start_server.py
```

### Building Standalone Executable

The backend can be packaged as a standalone executable using box-packager:

```bash
# Navigate to Python backend
cd src-python

# Install box-packager (if not already installed)
uv pip install box-packager

# Package the application
box package

# The executable will be in target/release/lerobot-arena-server
./target/release/lerobot-arena-server
```

Note: Requires [Rust/Cargo](https://rustup.rs/) to be installed for box-packager to work.

## 📋 Project Structure

```
lerobot-arena/
├── src/                    # Svelte frontend source
│   ├── lib/               # Reusable components and utilities
│   ├── routes/            # SvelteKit routes
│   └── app.html           # App template
├── src-python/            # Python backend
│   ├── src/               # Python source code
│   ├── start_server.py    # Server entry point
│   ├── target/            # Box-packager build output (excluded from git)
│   └── pyproject.toml     # Python dependencies
├── static/                # Static assets
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose setup
└── package.json           # Node.js dependencies
```

## 🐳 Docker Information

The Docker setup includes:

- **Multi-stage build**: Optimized for production using Bun and uv
- **Automatic startup**: Both services start together
- **Port mapping**: Backend on 8080, Frontend on 7860 (HF Spaces compatible)
- **Static file serving**: Compiled Svelte app served efficiently
- **User permissions**: Properly configured for Hugging Face Spaces
- **Standalone executable**: Backend packaged with box-packager for faster startup

For detailed Docker documentation, see [DOCKER_README.md](./DOCKER_README.md).

## 🔧 Building for Production

### Frontend Only

```bash
bun run build
```

### Backend Standalone Executable

```bash
cd src-python
box package
```

### Complete Docker Build

```bash
docker-compose up --build
```

## 🌐 What's Included

- **Real-time Robot Control**: WebSocket-based communication
- **3D Visualization**: Three.js integration for robot visualization
- **URDF Support**: Load and display robot models
- **Multi-robot Management**: Control multiple robots simultaneously
- **WebSocket API**: Real-time bidirectional communication
- **Standalone Distribution**: Self-contained executable with box-packager

## 🚨 Troubleshooting

### Port Conflicts

If ports 8080 or 7860 are already in use:

```bash
# Check what's using the ports
lsof -i :8080
lsof -i :7860

# Use different ports
docker run -p 8081:8080 -p 7861:7860 lerobot-arena
```

### Container Issues

```bash
# View logs
docker-compose logs lerobot-arena

# Rebuild without cache
docker-compose build --no-cache
docker-compose up
```

### Development Issues

```bash
# Clear node modules and reinstall
rm -rf node_modules
bun install

# Clear Svelte kit cache
rm -rf .svelte-kit
bun run dev
```

### Box-packager Issues

```bash
# Clean build artifacts
cd src-python
box clean

# Rebuild executable
box package

# Install cargo if missing
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## 🚀 Hugging Face Spaces Deployment

This project is configured for **Static HTML** deployment on Hugging Face Spaces (much simpler than Docker!):

**Manual Upload (Easiest):**
1. Run `bun install && bun run build` locally
2. Create a new Space with "Static HTML" SDK
3. Upload all files from `build/` folder
4. Your app is live!

**GitHub Integration:**
1. Fork this repository 
2. Create a Space and connect your GitHub repo
3. The Static HTML SDK will be auto-detected from the README frontmatter
4. Push changes to auto-deploy

No Docker, no complex setup - just static files! 🎉

## 📚 Additional Documentation

- [Docker Setup Guide](./DOCKER_README.md) - Detailed Docker instructions
- [Robot Architecture](./ROBOT_ARCHITECTURE.md) - System architecture overview
- [Robot Instancing Guide](./ROBOT_INSTANCING_README.md) - Multi-robot setup

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker: `docker-compose up --build`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ for the robotics community** 🤖
