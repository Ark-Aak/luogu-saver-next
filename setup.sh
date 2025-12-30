#!/bin/bash

# Start Redis
echo "Starting Redis..."
sudo systemctl start redis

# Create MySQL database
echo "Creating database 'lgs_ng_db'..."
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS lgs_ng_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo "Done! You can now run: npm run dev"
