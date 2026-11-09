# eMAG Relay Setup (Contabo + Railway) via Windows PowerShell

This runbook documents the exact setup flow that worked for BEOKBG:

- Contabo VPS (Ubuntu + Nginx) as outbound fixed-IP relay
- Railway app using relay for eMAG API calls
- Domain managed in Spaceship
- Execution from Windows PowerShell to avoid VNC keyboard mapping issues

---

## 1) Prerequisites

- Domain DNS managed in Spaceship
- Contabo VPS online (public IPv4 reachable)
- SSH access to VPS (root or sudo user)
- Railway service already running
- Existing eMAG credentials:
  - `EMAG_USERNAME`
  - `EMAG_PASSWORD`

---

## 2) DNS in Spaceship

Create an `A` record:

- Type: `A`
- Host: `emag-relay`
- Value: `<your_contabo_public_ipv4>`
- TTL: `300` (or Auto)

Do not use `https://` in DNS value.

---

## 3) Connect from Windows PowerShell

Use real server identity (not placeholders):

```powershell
$SERVER = "root@<your_vps_ip>"
ssh $SERVER "echo connected"
```

If root login is disabled, use your sudo user:

```powershell
$SERVER = "ubuntu@<your_vps_ip>"
ssh $SERVER "echo connected"
```

---

## 4) Generate relay secret (PowerShell)

```powershell
$SECRET = -join ((33..126) | Get-Random -Count 48 | ForEach-Object {[char]$_})
$SECRET
```

Save this value securely. The same secret must be used in:

1. Nginx relay config (`$relay_secret`)
2. Railway env var `EMAG_RELAY_SHARED_SECRET`

---

## 5) Provision Nginx relay on Ubuntu (single PowerShell block)

Run from Windows PowerShell:

```powershell
$SERVER = "root@<your_vps_ip>"      # or ubuntu@<your_vps_ip>
$DOMAIN = "emag-relay.beoksmart.com"
$SECRET = "<your_generated_secret>"

$nginxConfig = @"
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    set `$relay_secret "$SECRET";

    location / {
        if (`$http_x_relay_secret != `$relay_secret) {
            return 403;
        }

        proxy_pass https://marketplace-api.emag.bg/api-3/;
        proxy_ssl_server_name on;

        proxy_set_header Host marketplace-api.emag.bg;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;

        proxy_http_version 1.1;
        proxy_connect_timeout 15s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
"@

ssh $SERVER "sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx"
$nginxConfig | ssh $SERVER "sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null"
ssh $SERVER "sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN"
ssh $SERVER "sudo rm -f /etc/nginx/sites-enabled/default"
ssh $SERVER "sudo nginx -t && sudo systemctl reload nginx"
```

---

## 6) Validate relay behavior before SSL

From Windows PowerShell:

```powershell
curl.exe -i "http://emag-relay.beoksmart.com/product_offer/read"
curl.exe -i "http://emag-relay.beoksmart.com/product_offer/read" -H "x-relay-secret: $SECRET"
```

Expected:

- Without header: `403 Forbidden`
- With header: request reaches upstream (commonly `401` from eMAG if endpoint auth/use is restricted)

`401` from eMAG confirms relay forwarding works.

---

## 7) Enable HTTPS on VPS

SSH to VPS and run:

```bash
sudo certbot --nginx -d emag-relay.beoksmart.com
```

Recommended choices during prompts:

- Enter valid email
- Accept Terms
- Redirect HTTP to HTTPS

Then verify:

```bash
curl --head http://emag-relay.beoksmart.com
curl --head https://emag-relay.beoksmart.com
```

Expected:

- HTTP: `301` to HTTPS
- HTTPS (without relay header): `403`

---

## 8) Configure Railway

Set variables in Railway service:

- `EMAG_BASE_URL=https://emag-relay.beoksmart.com`
- `EMAG_RELAY_SHARED_SECRET=<same_secret_as_nginx>`
- `EMAG_USERNAME=<your_emag_username>`
- `EMAG_PASSWORD=<your_emag_password>`

Redeploy service after saving variables.

---

## 9) App-level verification

Trigger an eMAG action from admin flow (sync, stock, price, or orders).

If relay is correct but credentials/permissions are wrong, errors should now come from eMAG API (not networking).

---

## Troubleshooting notes (from actual setup)

1. **PowerShell `$Host` conflict**
   - `$Host` is read-only built-in variable.
   - Use `$SERVER`, not `$HOST`.

2. **Placeholder not replaced**
   - `root@YOUR_SERVER_IP` must be replaced with real IP.

3. **Double user prefix**
   - Wrong: `root@root@5.183...`
   - Correct: `root@5.183...`

4. **Secret header test typo**
   - Do not use angle brackets in header value.
   - Wrong: `x-relay-secret: <secret>`
   - Correct: `x-relay-secret: secret`

5. **curl on Ubuntu**
   - Use `curl`, not `curl.exe`.

6. **Keyboard mapping via VNC**
   - Prefer PowerShell+SSH for config pasting to avoid symbol remapping (`_`, `$`, `{}`, etc).

