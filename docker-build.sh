#!/bin/bash

# Build and run the LeRobot Arena Frontend Docker container

set -e

echo "🏗️  Building LeRobot Arena Frontend Docker image..."

# Build the image
docker build -t lerobot-arena-svelte-frontend .

echo "✅ Build completed successfully!"

echo "🚀 Starting the container..."

# Run the container
docker run -d \
  --name lerobot-arena-svelte-frontend \
  -p 3000:3000 \
  --restart unless-stopped \
  lerobot-arena-svelte-frontend

echo "✅ Container started successfully!"
echo "🌐 Frontend is available at: http://localhost:3000"
echo ""
echo "📋 Useful commands:"
echo "  • View logs:    docker logs -f lerobot-arena-svelte-frontend"
echo "  • Stop:         docker stop lerobot-arena-svelte-frontend"
echo "  • Remove:       docker rm lerobot-arena-svelte-frontend"
echo "  • Health check: docker inspect --format='{{.State.Health.Status}}' lerobot-arena-svelte-frontend" 