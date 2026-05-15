# Deployment

## Server

- **Host**: `136.244.84.42`
- **Path**: `/opt/themis/`
- **SSH key**: `~/.ssh/id_ed25519_themis`
- **User**: `root`

## Upload static files to server

```bash
scp -i ~/.ssh/id_ed25519_themis <local-file> root@136.244.84.42:/opt/themis/public/
```

### Example: upload video

```bash
scp -i ~/.ssh/id_ed25519_themis /Users/mfossati/Documents/0101/git/Themis/public/themis-presentazione-ita.mp4 root@136.244.84.42:/opt/themis/public/
```

The file will be accessible at: `http://136.244.84.42/themis-presentazione-ita.mp4`

## SSH into server

```bash
ssh -i ~/.ssh/id_ed25519_themis root@136.244.84.42
```
