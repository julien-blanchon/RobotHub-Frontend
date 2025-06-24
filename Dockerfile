# Multi-stage Dockerfile for LeRobot Arena Frontend
# Stage 1: Build the Svelte application with Bun
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Install git for dependencies that might need it
RUN apk add --no-cache git

# Copy package files for dependency resolution (better caching)
COPY package.json bun.lock* ./

# Copy local packages that are linked in package.json
COPY packages/ ./packages/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the static application
RUN bun run build

# Stage 2: Serve with Bun's simple static server
FROM oven/bun:1-alpine AS production

# Set up a new user named "user" with user ID 1000 (required for HF Spaces)
RUN adduser -D -u 1000 user

# Switch to the "user" user
USER user

# Set home to the user's home directory
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Set the working directory to the user's home directory
WORKDIR $HOME/app

# Copy built application from previous stage with proper ownership
COPY --chown=user --from=builder /app/build ./

# Expose port 7860 (HF Spaces default)
EXPOSE 7860

# Start simple static server using Bun
CMD ["bun", "--bun", "serve", ".", "--port", "7860"] 