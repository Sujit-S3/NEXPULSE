# Server build stage
FROM node:22-alpine AS server-builder
WORKDIR /app
COPY server/package*.json ./
RUN npm ci
COPY server/ .
RUN npm run build

# Server production stage
FROM node:22-alpine AS server
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=server-builder /app/dist ./dist
COPY --from=server-builder /app/node_modules ./node_modules
COPY --from=server-builder /app/package.json ./
RUN chown -R node:node /app
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/api/v1/health || exit 1
CMD ["node", "dist/index.js"]

# Client build stage
FROM node:22-alpine AS client-builder
WORKDIR /app
COPY client/package*.json ./
RUN npm ci --ignore-scripts
COPY client/ .
RUN npm run build

# Client production stage (nginx)
FROM nginx:1.27-alpine AS client
COPY --from=client-builder /app/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /etc/nginx/conf.d
USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off; pid /tmp/nginx.pid;"]
