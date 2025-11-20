#!/bin/bash

# Create directory for certificates if it doesn't exist (mapped to certs volume)
# Since we use a named volume 'certs', we use a temporary container to check/create files.

echo "Checking for existing certificates..."

# Check if certificate exists in the volume
docker-compose run --rm --entrypoint "sh -c 'if [ ! -f /acme.sh/xeghepnghiaphat.io.vn/fullchain.pem ]; then echo \"missing\"; fi'" certbot > status_check.txt

if grep -q "missing" status_check.txt; then
  echo "No certificate found. Generating dummy certificate to allow Nginx to start..."
  
  # Create directory
  docker-compose run --rm --entrypoint "mkdir -p /acme.sh/xeghepnghiaphat.io.vn" certbot
  
  # Generate dummy self-signed cert
  docker-compose run --rm --entrypoint "\
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /acme.sh/xeghepnghiaphat.io.vn/key.pem \
    -out /acme.sh/xeghepnghiaphat.io.vn/fullchain.pem \
    -subj '/CN=localhost'" certbot
    
  echo "Dummy certificate created."
else
  echo "Certificate already exists."
fi

rm status_check.txt

echo "Starting all services..."
docker-compose up -d

echo "Deployment started."
echo "The 'certbot' container will now attempt to request a real certificate from Let's Encrypt."
echo "You can follow the logs with: docker-compose logs -f certbot"
