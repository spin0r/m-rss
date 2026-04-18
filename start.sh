#!/bin/bash

echo "=== Starting RSS Bot Dashboard ==="

# Function to clean and reinstall
clean_install() {
    echo "Cleaning node_modules and cache..."
    rm -rf node_modules package-lock.json
    npm cache clean --force 2>/dev/null || true
    
    echo "Installing production dependencies..."
    npm install --save --no-audit --no-fund \
        @google-cloud/translate@^8.5.0 \
        bcrypt@^5.1.1 \
        child_process@^1.0.2 \
        dotenv@^16.4.7 \
        express@^4.21.2 \
        express-session@^1.18.1 \
        rss-parser@^3.13.0 \
        session-file-store@^1.5.0 \
        telegraf@^4.16.3 \
        tree-kill@^1.2.2
    
    echo "Installing dev dependencies..."
    npm install --save-dev --no-audit --no-fund \
        @types/bcrypt@^5.0.2 \
        @types/cookie-parser@^1.4.8 \
        @types/express@^5.0.0 \
        @types/express-session@^1.18.1 \
        @types/node@^22.13.4 \
        @types/session-file-store@^1.2.5 \
        cross-env@^7.0.3 \
        ts-node-dev@^2.0.0 \
        tsc-alias@^1.8.10 \
        tsconfig-paths@^4.2.0 \
        typescript@^5.7.3
}

# Function to build project
build_project() {
    echo "Building project..."
    npm run build
    
    # Wait for build to complete
    retries=10
    while [ $retries -gt 0 ] && [ ! -f "dist/server.js" ]; do
        echo "Waiting for build to complete..."
        sleep 1
        retries=$((retries-1))
    done
    
    if [ -f "dist/server.js" ]; then
        return 0
    else
        return 1
    fi
}

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "node_modules not found, installing all dependencies..."
    
    echo "Installing production dependencies..."
    npm install --save --no-audit --no-fund \
        @google-cloud/translate@^8.5.0 \
        bcrypt@^5.1.1 \
        child_process@^1.0.2 \
        dotenv@^16.4.7 \
        express@^4.21.2 \
        express-session@^1.18.1 \
        rss-parser@^3.13.0 \
        session-file-store@^1.5.0 \
        telegraf@^4.16.3 \
        tree-kill@^1.2.2
    
    echo "Installing dev dependencies..."
    npm install --save-dev --no-audit --no-fund \
        @types/bcrypt@^5.0.2 \
        @types/cookie-parser@^1.4.8 \
        @types/express@^5.0.0 \
        @types/express-session@^1.18.1 \
        @types/node@^22.13.4 \
        @types/session-file-store@^1.2.5 \
        cross-env@^7.0.3 \
        ts-node-dev@^2.0.0 \
        tsc-alias@^1.8.10 \
        tsconfig-paths@^4.2.0 \
        typescript@^5.7.3
fi

# Try to build
if ! build_project; then
    echo "Build failed, attempting clean install..."
    clean_install
    if ! build_project; then
        echo "Build failed after clean install, exiting..."
        exit 1
    fi
fi

# Check if dist/server.js exists
if [ ! -f "dist/server.js" ]; then
    echo "dist/server.js not found after build, exiting..."
    exit 1
fi

# Try to start the server
echo "Starting server..."
node dist/server.js

# If server crashes, try one more time with clean install
if [ $? -ne 0 ]; then
    echo "Server crashed, attempting recovery with clean install..."
    clean_install
    build_project
    echo "Restarting server..."
    node dist/server.js
fi
