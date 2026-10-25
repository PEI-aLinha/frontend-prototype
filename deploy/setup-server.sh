#!/usr/bin/env bash
set -euo pipefail
DOMAIN=pei-alinha.duckdns.org
ROOT=/var/www/alinha
PROXY=/root/Platform-rally-extension/deploy
CONF="$PROXY/nginx.conf"
NETWORK=nei-rally-dev_rally
APP_CONF="$(cd "$(dirname "$0")" && pwd)/app-nginx.conf"
[[ -f "$CONF" ]] || { echo "Missing shared proxy config: $CONF" >&2; exit 1; }
docker network inspect "$NETWORK" >/dev/null
[[ -e "$ROOT/current/index.html" ]] || { echo "Upload first build to $ROOT/current" >&2; exit 1; }
install -d -m 0755 "$PROXY/certs"
install -m 0644 "$APP_CONF" "$PROXY/alinha-nginx.conf"
docker rm -f alinha-web >/dev/null 2>&1 || true
docker run -d --name alinha-web --restart unless-stopped --network "$NETWORK" \
  --network-alias alinha-web -v "$ROOT:/srv:ro" \
  -v "$PROXY/alinha-nginx.conf:/etc/nginx/conf.d/default.conf:ro" nginx:1.27-alpine
if ! grep -Fq "$DOMAIN" "$CONF"; then
  cp -a "$CONF" "$CONF.before-alinha"
  python3 - "$CONF" "$DOMAIN" <<'PY'
from pathlib import Path
import sys
p, domain = Path(sys.argv[1]), sys.argv[2]
s = p.read_text()
old = "server_name nei-dev.duckdns.org nei-dev-auth.duckdns.org sonar-martimgil.duckdns.org tqs-cacifly.duckdns.org;"
if old not in s: raise SystemExit("Expected HTTP server_name missing; config unchanged")
p.write_text(s.replace(old, old[:-1] + f" {domain};", 1))
PY
  docker exec nei-rally-dev-proxy-1 nginx -t
  docker exec nei-rally-dev-proxy-1 nginx -s reload
fi
certbot certonly --webroot -w "$PROXY/certbot-webroot" --cert-name "$DOMAIN" \
  -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email
cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$PROXY/certs/alinha-fullchain.pem"
cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$PROXY/certs/alinha-privkey.pem"
chmod 0644 "$PROXY/certs/alinha-fullchain.pem"
chmod 0600 "$PROXY/certs/alinha-privkey.pem"
install -d -m 0755 /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/pei-alinha-duckdns.org.sh <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
if [[ "${RENEWED_LINEAGE:-}" == "/etc/letsencrypt/live/pei-alinha.duckdns.org" ]]; then
  cp "$RENEWED_LINEAGE/fullchain.pem" /root/Platform-rally-extension/deploy/certs/alinha-fullchain.pem
  cp "$RENEWED_LINEAGE/privkey.pem" /root/Platform-rally-extension/deploy/certs/alinha-privkey.pem
  chmod 0644 /root/Platform-rally-extension/deploy/certs/alinha-fullchain.pem
  chmod 0600 /root/Platform-rally-extension/deploy/certs/alinha-privkey.pem
  docker exec nei-rally-dev-proxy-1 nginx -s reload
fi
HOOK
chmod 0755 /etc/letsencrypt/renewal-hooks/deploy/pei-alinha-duckdns.org.sh
if ! grep -Fq "server_name $DOMAIN;" "$CONF"; then
  python3 - "$CONF" "$DOMAIN" <<'PY'
from pathlib import Path
import sys
p, domain = Path(sys.argv[1]), sys.argv[2]
s = p.read_text()
block = '''
    server {
        listen 443 ssl;
        http2 on;
        server_name DOMAIN;
        ssl_certificate /etc/nginx/certs/alinha-fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/alinha-privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        location / {
            set $alinha_web alinha-web;
            proxy_pass http://$alinha_web:80;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
'''.replace("DOMAIN", domain)
i = s.rfind("}")
if i < 0: raise SystemExit("Nginx http block end not found")
p.write_text(s[:i] + block + s[i:])
PY
fi
docker exec nei-rally-dev-proxy-1 nginx -t
docker exec nei-rally-dev-proxy-1 nginx -s reload
echo "https://$DOMAIN is configured."
