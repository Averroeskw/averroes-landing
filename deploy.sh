#!/bin/bash
# Deploy averroes-landing to ZimaBoard
# Usage: ./deploy.sh

set -e

REMOTE="Home-Lab@192.168.3.34"
SSH_KEY="$HOME/.ssh/id_ed25519"
SSH="ssh -i $SSH_KEY $REMOTE"
DEPLOY_DIR="/tmp/averroes-landing-v3"
DOCKER_CMD="DOCKER_CONFIG=/tmp/.docker docker"

echo "=== Building frontend ==="
cd "$(dirname "$0")"
npm run build

echo ""
echo "=== Syncing files to ZimaBoard ==="
rsync -avz --delete -e "ssh -i $SSH_KEY" dist/ $REMOTE:$DEPLOY_DIR/dist/
rsync -avz --exclude node_modules -e "ssh -i $SSH_KEY" server/ $REMOTE:$DEPLOY_DIR/server/
scp -i $SSH_KEY package.json package-lock.json .env $REMOTE:$DEPLOY_DIR/
# Copy Dockerfile to root for docker build
$SSH "cp $DEPLOY_DIR/server/Dockerfile $DEPLOY_DIR/Dockerfile"

echo ""
echo "=== Building Docker image ==="
$SSH "$DOCKER_CMD build --tag averroes-landing:v3 $DEPLOY_DIR"

echo ""
echo "=== Stopping old container ==="
$SSH "$DOCKER_CMD stop averroes-landing-v3 2>/dev/null || true"
$SSH "$DOCKER_CMD rm averroes-landing-v3 2>/dev/null || true"

echo ""
echo "=== Starting container ==="
$SSH "$DOCKER_CMD run -d \
  --name averroes-landing-v3 \
  --restart unless-stopped \
  -p 3003:3001 \
  -v averroes-landing-data:/app/data \
  -v $DEPLOY_DIR/dist:/app/dist:ro \
  --env-file $DEPLOY_DIR/.env \
  averroes-landing:v3"

echo ""
echo "=== Verifying ==="
sleep 3
$SSH "$DOCKER_CMD logs averroes-landing-v3 2>&1 | tail -5"

STATUS=$($SSH "curl -s -o /dev/null -w '%{http_code}' http://localhost:3003")
STATUS_HEALTH=$($SSH "curl -s -o /dev/null -w '%{http_code}' http://localhost:3003/health")
STATUS_404=$($SSH "curl -s -o /dev/null -w '%{http_code}' http://localhost:3003/nonexistent")

echo ""
echo "Landing page: HTTP $STATUS"
echo "Health check: HTTP $STATUS_HEALTH"
echo "404 page:     HTTP $STATUS_404"

if [ "$STATUS" = "200" ] && [ "$STATUS_HEALTH" = "200" ] && [ "$STATUS_404" = "404" ]; then
  echo ""
  echo "Deploy successful!"
  echo "  https://averroes.cloud"
  echo "  https://averroes.cloud/health"
else
  echo ""
  echo "WARNING: Unexpected status codes"
fi
