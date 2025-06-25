#!/usr/bin/env bun

// Simple static file server for Svelte build output
import { join } from "path";

const PORT = process.env.PORT || 8000;
const BUILD_DIR = "./build";

// MIME types for common web assets
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

function getMimeType(filename) {
  const ext = filename.substring(filename.lastIndexOf('.'));
  return MIME_TYPES[ext] || 'application/octet-stream';
}

const server = Bun.serve({
  port: PORT,
  hostname: "localhost",
  
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;
    
    // Remove leading slash and default to index.html for root
    if (pathname === '/') {
      pathname = 'index.html';
    } else {
      pathname = pathname.substring(1); // Remove leading slash
    }
    
    try {
      // Try to serve the requested file
      const filePath = join(BUILD_DIR, pathname);
      const file = Bun.file(filePath);
      
      if (await file.exists()) {
        const mimeType = getMimeType(pathname);
        const headers = {
          'Content-Type': mimeType,
        };
        
        // Set cache headers
        if (pathname.includes('/_app/immutable/')) {
          // Long-term cache for immutable assets
          headers['Cache-Control'] = 'public, max-age=31536000, immutable';
        } else if (pathname.endsWith('.html')) {
          // No cache for HTML files
          headers['Cache-Control'] = 'public, max-age=0, must-revalidate';
        } else {
          // Short cache for other assets
          headers['Cache-Control'] = 'public, max-age=3600';
        }
        
        return new Response(file, { headers });
      }
      
      // If file not found and no extension, serve index.html for SPA routing
      if (!pathname.includes('.')) {
        const indexFile = Bun.file(join(BUILD_DIR, 'index.html'));
        if (await indexFile.exists()) {
          return new Response(indexFile, {
            headers: {
              'Content-Type': 'text/html',
              'Cache-Control': 'public, max-age=0, must-revalidate'
            }
          });
        }
      }
      
      return new Response('Not Found', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
      
    } catch (error) {
      console.error('Server error:', error);
      return new Response('Internal Server Error', { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
});

console.log(`🚀 Static server running on http://localhost:${server.port}`);
console.log(`📁 Serving files from: ${BUILD_DIR}`); 