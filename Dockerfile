# Frontend Dockerfile for SUMO Traffic Management Dashboard

# Use Node.js LTS version
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 8080

# Start development server
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_BASE_URL=http://localhost:3001/api
ARG VITE_WEBSOCKET_URL=ws://localhost:3001/ws
ARG VITE_MAP_DEFAULT_ZOOM=13
ARG VITE_MAP_DEFAULT_LAT=9.0331
ARG VITE_MAP_DEFAULT_LNG=38.7500
ARG VITE_ENABLE_DEBUG_LOGGING=false
ARG VITE_MOCK_DATA_MODE=false
ARG VITE_ENABLE_EMERGENCY_VEHICLES=true
ARG VITE_ENABLE_TRAFFIC_LIGHT_CONTROL=true
ARG VITE_ENABLE_ANALYTICS=true

# Set environment variables
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WEBSOCKET_URL=$VITE_WEBSOCKET_URL
ENV VITE_MAP_DEFAULT_ZOOM=$VITE_MAP_DEFAULT_ZOOM
ENV VITE_MAP_DEFAULT_LAT=$VITE_MAP_DEFAULT_LAT
ENV VITE_MAP_DEFAULT_LNG=$VITE_MAP_DEFAULT_LNG
ENV VITE_ENABLE_DEBUG_LOGGING=$VITE_ENABLE_DEBUG_LOGGING
ENV VITE_MOCK_DATA_MODE=$VITE_MOCK_DATA_MODE
ENV VITE_ENABLE_EMERGENCY_VEHICLES=$VITE_ENABLE_EMERGENCY_VEHICLES
ENV VITE_ENABLE_TRAFFIC_LIGHT_CONTROL=$VITE_ENABLE_TRAFFIC_LIGHT_CONTROL
ENV VITE_ENABLE_ANALYTICS=$VITE_ENABLE_ANALYTICS

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS production

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Create non-root user for nginx
RUN addgroup -g 101 -S nginx-user && \
    adduser -S nginx-user -u 101 -G nginx-user && \
    chown -R nginx-user:nginx-user /var/cache/nginx && \
    chown -R nginx-user:nginx-user /var/log/nginx && \
    chown -R nginx-user:nginx-user /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx-user:nginx-user /var/run/nginx.pid

# Switch to non-root user
USER nginx-user

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
