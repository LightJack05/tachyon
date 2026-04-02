FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy app source into web root
COPY src/ /usr/share/nginx/html/

# config.yaml is NOT baked in — it must be mounted at runtime
# (K8s ConfigMap volume or docker-compose bind mount)
# Expected mount path: /usr/share/nginx/html/config.yaml

EXPOSE 80
