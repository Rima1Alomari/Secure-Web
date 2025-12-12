#!/bin/bash

# Start script for Secure Web
echo "Starting Secure Web..."

# Check if MongoDB is running (optional)
# mongod --version > /dev/null 2>&1 || echo "Warning: MongoDB might not be running"

# Install dependencies if node_modules don't exist
if [ ! -d "node_modules" ]; then
  echo "Installing root dependencies..."
  npm install
fi

if [ ! -d "server/node_modules" ]; then
  echo "Installing server dependencies..."
  cd server && npm install && cd ..
fi

if [ ! -d "client/node_modules" ]; then
  echo "Installing client dependencies..."
  cd client && npm install && cd ..
fi

# Start both server and client
echo "Starting server and client..."
npm run dev

