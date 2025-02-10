#!/usr/bin/env bash
set -o errexit

npm install
# npm run build  # Uncomment this if you need to build

# Store/pull Puppeteer cache with Render build cache
PUPPETEER_CACHE_DIR="/opt/render/project/puppeteer"

if [[ ! -d $PUPPETEER_CACHE_DIR ]]; then
  echo "...Copying Puppeteer Cache from Build Cache"
  cp -R $XDG_CACHE_HOME/puppeteer/ $PUPPETEER_CACHE_DIR
else
  echo "...Storing Puppeteer Cache in Build Cache"
  cp -R $PUPPETEER_CACHE_DIR $XDG_CACHE_HOME
fi
