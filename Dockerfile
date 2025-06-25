# Multi-stage build for optimal image size and security
FROM oven/bun:1.2.17-alpine AS base

# Install curl for healthcheck
RUN apk --no-cache add curl

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S user && \
    adduser -S user -u 1001

# ===============================
# Dependencies stage
# ===============================
FROM base AS deps

# Copy package files for dependency installation
COPY package.json bun.lock* ./

# Copy local packages and external dependencies
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
COPY --from=builder --chown=user:user /app/build ./build
COPY --chown=user:user static-server.js ./

# Switch to non-root user
USER user

ARG PUBLIC_TRANSPORT_SERVER_URL=https://blanchon-robothub-transportserver.hf.space/api
ENV PUBLIC_TRANSPORT_SERVER_URL=${PUBLIC_TRANSPORT_SERVER_URL}

ARG PUBLIC_INFERENCE_SERVER_URL=https://blanchon-robothub-inferenceserver.hf.space/api
ENV PUBLIC_INFERENCE_SERVER_URL=${PUBLIC_INFERENCE_SERVER_URL}

ARG PORT=8000
ENV PORT=${PORT}

# Expose port
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/ || exit 1

# Start custom static file server
CMD ["bun", "static-server.js"] 