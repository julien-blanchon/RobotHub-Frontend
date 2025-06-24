# Multi-stage build for optimal image size and security
FROM oven/bun:1.2.17-alpine AS base

# Install curl for healthcheck and git for submodules
RUN apk --no-cache add curl git

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S svelte && \
    adduser -S svelteuser -u 1001

# ===============================
# Dependencies stage
# ===============================
FROM base AS deps

# Copy git configuration and submodule files
COPY .git .git
COPY .gitmodules* ./

# Initialize and update git submodules
RUN git config --global --add safe.directory /app && \
    git submodule update --init --recursive

# Copy package files for dependency installation
COPY package.json bun.lock* ./

# Copy local packages and external dependencies (now populated)
COPY packages/ packages/
COPY external/ external/

# Install dependencies with frozen lockfile (including devDependencies)
RUN bun install --frozen-lockfile

# ===============================
# Build stage
# ===============================
FROM base AS builder

# Copy installed dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/external ./external

# Copy source code and configuration files
COPY . .

# Build the static site
RUN bun run build

# ===============================
# Production stage
# ===============================
FROM base AS runner

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000

# Copy built application and static server
COPY --from=builder --chown=svelteuser:svelte /app/build ./build
COPY --chown=svelteuser:svelte static-server.js ./

# Switch to non-root user
USER svelteuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Start custom static file server
CMD ["bun", "static-server.js"] 