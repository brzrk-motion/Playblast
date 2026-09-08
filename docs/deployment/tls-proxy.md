# TLS, reverse proxy, and network exposure

Playblast does **not** ship built-in HTTPS. Production session cookies are marked `Secure` whenever `NODE_ENV=production`, so browsers will not send them over plain `http://` (except special cases like `http://localhost`). Treat TLS (or an equivalent private path) as required for real studio use.

## Recommended stances

| Stance | When to use | What to do |
|--------|-------------|------------|
| **LAN / VPN only (default for pilots)** | Studio network or WireGuard/Tailscale/OpenVPN | Do **not** publish Playblast to the public internet. Reach `https://…` or a VPN IP only from trusted clients. |
| **Public HTTPS via reverse proxy** | Remote freelancers need browser access without VPN | Terminate TLS at Caddy/nginx/Traefik; keep the Playblast container off the public port map. |

Both stances are operator-owned. Playblast will not obtain certificates, configure DNS, or manage your firewall.

## Why this matters

- Production cookies use the `Secure` flag (`server/src/auth/cookies.ts`). Plain public HTTP breaks login/session in modern browsers.
- Uploads can be large (`MAX_UPLOAD_SIZE`, default 5000 MB). Proxies must allow large request bodies and long timeouts.
- Auth rate limiting uses Express `req.ip`, which honors `X-Forwarded-For` **only** when `PROXY_HOPS` > 0. Default is `0` (ignore client-supplied forwarded headers).

## LAN / VPN-only checklist

1. Install with the base Compose file (`docker compose up -d --build`) or Synology path in [install-linux-nas.md](./install-linux-nas.md).
2. Bind the host port only on a private interface, or keep the NAS/firewall closed to WAN.
3. Prefer VPN for off-site access instead of opening `:3000` to the world.
4. If you must use plain HTTP on a closed LAN, understand that **production Secure cookies may still block browsers**—use HTTPS on the LAN (see Caddy `tls internal` below) or access via `localhost`/SSH tunnel for smoke tests only.

## Caddy overlay (recommended)

Files in this repository:

| File | Purpose |
|------|---------|
| [`docker-compose.proxy.yml`](https://github.com/brzrk-motion/Playblast/blob/development-mvp/docker-compose.proxy.yml) | Adds Caddy; un-publishes host `:3000`; sets `PROXY_HOPS=1` |
| [`deploy/caddy/Caddyfile`](https://github.com/brzrk-motion/Playblast/blob/development-mvp/deploy/caddy/Caddyfile) | TLS site block + large upload limits |

### Public hostname (Let's Encrypt)

```bash
cp docker-compose.env.example .env
# set SESSION_SECRET (32+ chars)

export PLAYBLAST_DOMAIN=playblast.example.com
docker compose -f docker-compose.yml -f docker-compose.proxy.yml up -d --build
```

Point DNS `A`/`AAAA` for `PLAYBLAST_DOMAIN` at the host. Caddy will attempt ACME certificates when ports 80/443 are reachable from the internet.

Open `https://$PLAYBLAST_DOMAIN` and complete first-run setup.

### LAN hostname with internal TLS

Edit `deploy/caddy/Caddyfile` to use `tls internal` for your LAN name (see comments in that file), set `PLAYBLAST_DOMAIN` accordingly, and trust Caddy’s local CA on studio devices—or distribute your own internal CA. Operator-owned.

### Verify

```bash
curl -fsS https://$PLAYBLAST_DOMAIN/health
# expect "status":"ok" and "database":"ok"
```

## nginx snippet (alternative)

Terminate TLS at nginx and proxy to the Playblast container (or `127.0.0.1:3000` if you keep the base port publish on localhost only):

```nginx
server {
  listen 443 ssl http2;
  server_name playblast.example.com;

  # ssl_certificate / ssl_certificate_key: operator-managed

  client_max_body_size 6g;
  proxy_read_timeout 3600s;
  proxy_send_timeout 3600s;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

Do not put this server on the public internet without valid certificates and a maintenance plan.

## Synology notes

- Prefer Synology’s reverse proxy / certificate UI **or** the Caddy overlay if you run Compose projects with multiple services.
- Keep Hyper Backup on `data/` + `uploads/` regardless of TLS path ([backup-restore.md](./backup-restore.md)).

## `PROXY_HOPS` and Express trust proxy

Playblast sets Express `trust proxy` from `PROXY_HOPS` (default **0** for safety when no proxy is in front).

| Topology | `PROXY_HOPS` | Notes |
|----------|--------------|-------|
| Base Compose (host publishes `:3000`) | `0` (default) | Do not trust `X-Forwarded-*` from clients. |
| `docker-compose.proxy.yml` (Caddy/nginx on the compose network) | `1` (set by overlay) | Caddy is the only trusted forwarder; the app is not WAN-published. |

Caddy (and the nginx snippet below) send `X-Forwarded-Proto`, `X-Forwarded-Host`, `X-Real-IP`, and `X-Forwarded-For`. With `PROXY_HOPS=1`, Express uses those headers for `req.ip`, `req.protocol`, and `req.secure`.

**Do not** raise hops above the number of trusted proxies you control. Spoofed `X-Forwarded-For` from the open internet must never reach the app without a trusted hop stripping/overwriting it.

### Cookies and Secure

Production session cookies stay `Secure` whenever `NODE_ENV=production`. That flag is **not** disabled for plain HTTP on a LAN—use HTTPS at the proxy (or `tls internal` on LAN) so browsers will send cookies.

## No-support boundary

Studios own DNS, certificates, VPN, firewall, and proxy upgrades. Playblast provides the Compose overlay and this guide as starting points, not a managed hosting service.
