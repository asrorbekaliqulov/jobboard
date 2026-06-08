# Stage 1: Build the application
FROM node:20-alpine AS build-stage

WORKDIR /app

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy the rest of the code and build
COPY frontend/ .

# Ensure public folder is explicitly available
COPY frontend/public ./public

# Vite environment variables for build
ARG VITE_API_URL
ARG VITE_TELEGRAM_BOT_NAME
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_TELEGRAM_BOT_NAME=$VITE_TELEGRAM_BOT_NAME

RUN npm run build

# Debug: list dist contents to verify build output
RUN ls -la /app/dist && ls -la /app/dist/locales || echo "locales not in dist"

# Stage 2: Serve the application with Nginx
FROM nginx:stable-alpine AS production-stage

# Remove default nginx static files
RUN rm -rf /usr/share/nginx/html/*

# Copy the entire dist directory first to ensure nothing is missed
COPY --from=build-stage /app/dist/ /tmp/dist/

# Copy index.html from the src subfolder (due to Vite config)
RUN cp /tmp/dist/src/index.html /usr/share/nginx/html/

# Copy assets folder
RUN cp -r /tmp/dist/assets /usr/share/nginx/html/assets

# Copy locales folder for i18n support
COPY --from=build-stage /app/src/locales /usr/share/nginx/html/locales

# Copy logo
RUN cp /tmp/dist/logo.png /usr/share/nginx/html/logo.png || true
RUN cp /tmp/dist/logo_new.png /usr/share/nginx/html/logo_new.png || true


# Cleanup temp
RUN rm -rf /tmp/dist

# Copy the custom config to handle SPA routing (try_files)
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]