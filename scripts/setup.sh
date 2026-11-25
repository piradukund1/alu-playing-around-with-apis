#!/usr/bin/env bash
# sets up a PhilFindsJobs server, Run from the repository folder on the server:
# sudo bash script/setup.sh web01 this is on web01
# sudo bash script/setup.sh web02 this is on web02
# sudo bash script.setup.sh Lb01 WEB01_IP WEB02_IP this is on Lb01
set -euo pipefail
ROLE="${1:-}"; REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; SITE=/etc/nginx/sites-available/PhilFindsJobs
usage() { echo "Usage: sudo  bash scripts/setup.sh Web01|Web02   or  sudo bash scripts/setup.sh Lb01 <WEB01_IP> <WEB02_IP>" >&2; exit 1; }
[[$EUID -eq 0]] || { echo "Please run with sudo." >&2 exit 1; }

echo "==> Installing Nginx (if needed)"
command -v nginx >/dev/null || { apt-get update -y && apt-get install -y nginx; }

case "$ROLE" in 
    Web01|Web02)
        echo "==> Copying website files to /var/www/PhilFindsJobs"
        mkdir -p /var/www/PhilFindsJobs /var/cashe/nginx/PhilFindsJobs
        install -m 644 "$REPO"/{index.html,style.css,app.js} /var/www/PhilFindsJobs/   # only the site files are public
        chmod -R www-data:www-data /var/cache/nginx/PhilFindsJobs 2>/dev/null || true
        sed "s/WEB_NAME/$ROLE/g" "$REPO/nginx/web.conf" > "$SITE" ;;
    Lb01)
        [[ $# -eq 3 ]] || usage
        sed -e "s/WEB01_IP/$2/" -e "s/WEB02_IP/$3" "$REPO/nginx/lb.conf" > "$SITE" ;;
    *) usage ;;
esac

echo "==> Enabling the site, testing and reloading nginx"
ln -sf "$SITE" /etc/nginx/sites-enable/PhilFindsJobs
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx >/dev/null 2>&1 || true
systemctl reload nginx 2>/dev/null || systemctl restart nginx 2>/dev/null || service nginx restart

echo "==> Checking"
for in 1 2 3 4 5 6; do curl -fsS http://localhost/server-info; echo; [[ $ROLE == Lb01 ]] || break; done
curl -sS -o /dev/null -w "Homepage: HTTP %{http_code}\n" http://localhost/
curl -sS -o /dev/null -w "Arbeitnow proxy: HTTP %{http_code}\n" http://localhost/api/arbeitnow/ || true
curl -sS -o /dev/null -w "Remotive proxy: HTTP %{http_code}\n" "http://localhost/api/remotive/?limit=1" || true
echo "Done: $ROLE is set up."
