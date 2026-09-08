# Image tags and publish / load path

Playblast uses one canonical local image name everywhere Compose and Synology samples expect it.

| Context | Image reference |
|---------|-----------------|
| Local Compose / Synology sample | `playblast:latest` |
| `npm run build:deploy` default | `playblast:latest` → `deploy/playblast.tar.gz` |
| CI build (no push) | `playblast:ci` |
| Optional registry override | `IMAGE_NAME=ghcr.io/brzrk-motion/playblast:<tag>` |

## Tar load (supported now — NAS / air-gapped)

Build on a machine with enough RAM, then ship the tarball:

```bash
npm run build:deploy
# PLATFORM=linux/arm64 npm run build:deploy
# IMAGE_NAME=playblast:0.1.0-rc.1 npm run build:deploy

scp deploy/playblast.tar.gz admin@<host>:/path/to/playblast/
ssh admin@<host> 'sudo docker load < /path/to/playblast/playblast.tar.gz'
```

Point Compose `image:` at the tag you loaded (default `playblast:latest`). Volumes stay untouched across reloads — see [upgrade-rollback](./upgrade-rollback.md).

## GHCR / registry (documented path; not auto-published yet)

CI builds the image with `push: false` today. When maintainers enable GHCR publish, operators can pull instead of building:

```bash
docker pull ghcr.io/brzrk-motion/playblast:0.1.0-rc.1
```

Until then:

1. Prefer `npm run build:deploy` + `docker load` for Synology and low-RAM hosts.
2. Or `docker compose build` on the host if it has enough memory (native `better-sqlite3` compile can OOM — see [install-linux-nas](./install-linux-nas.md)).

To build a registry-ready tag locally without changing Compose defaults:

```bash
IMAGE_NAME=ghcr.io/brzrk-motion/playblast:0.1.0-rc.1 npm run build:deploy
# then docker load / docker push with your own credentials
```

Do not commit registry credentials. Package visibility and token scopes are operator/maintainer concerns.

## Consistency rule

- Scripts, Compose, and install docs must default to **`playblast:latest`**.
- Never leave `brzrk/playblast:latest` as a silent default that diverges from Compose.
- Document any registry tag as an explicit `IMAGE_NAME=` override.

## Validation

`npm run verify:deployment-config` asserts `build-deploy.sh` defaults to `playblast:latest` and that this guide exists.
