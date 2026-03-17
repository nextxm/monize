REGISTRY=registry.ucdialplans.com/monize
docker build -t $REGISTRY/backend:latest --target production -f backend/Dockerfile . && docker push $REGISTRY/backend:latest
docker build -t $REGISTRY/frontend:latest --target production ./frontend && docker push $REGISTRY/frontend:latest

# Example GHCR push for a fork or personal namespace
OWNER=your-github-username-or-org
docker build -t ghcr.io/$OWNER/monize-backend:latest --target production -f backend/Dockerfile . && docker push ghcr.io/$OWNER/monize-backend:latest
docker build -t ghcr.io/$OWNER/monize-frontend:latest --target production ./frontend && docker push ghcr.io/$OWNER/monize-frontend:latest

# Manual code scanners
```
docker run --rm -v ~/monize:/tmp/scan bearer/bearer:latest-amd64 scan /tmp/scan --skip-rule=[javascript_lang_logger_leak,javascript_express_https_protocol_missing]
```
