FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the React app for production
RUN npm run build

# Stage 2: Serve the built React app using Nginx
FROM nginx:alpine

# Copy the built React app from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy Nginx configuration
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Create a non-root user and group
RUN addgroup -S appgroup && adduser --system --no-create-home -S appuser -G appgroup

# Grant nginx directories to the non-root user
RUN chown -R appuser:appgroup /var/cache/nginx /var/run /run /etc/nginx /usr/share/nginx/html /tmp

USER appuser

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]