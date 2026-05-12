# Domain & Cloudflare Tunnel Guide

Nota ringkas untuk faham cara beli domain, sambungkan domain ke server, dan expose homelab tanpa public IP.

## Cara Dapatkan Domain

### Step 1: Beli Domain

Pergi ke mana-mana registrar:

- Namecheap
- Cloudflare Registrar
- GoDaddy
- Porkbun

Cari nama domain yang kau nak, contohnya:

```text
razi-tech.com
loki-co.com
```

Untuk domain `.com`, budget biasa lebih kurang:

```text
USD 10-15 / tahun
```

### Step 2: Point Domain ke Server

Ada dua situasi utama:

- Server ada public IP: buat DNS `A record` dan point domain ke IP server.
- Server tak ada public IP: guna Cloudflare Tunnel.

Kalau server duduk dekat rumah, homelab, VM, atau belakang router yang susah nak port forward, Cloudflare Tunnel biasanya pilihan paling cantik.

## Cara Saleh: Best untuk Homelab

Contoh setup:

```text
Domain: loki-co.com
Server: VM108 dalam rumah
Tunnel: Cloudflare Tunnel
```

Flow dia:

```text
Internet -> Cloudflare Tunnel -> Server dalam rumah (VM108)
```

Kenapa setup ni best:

- Tak perlu public IP.
- Tak perlu port forward router.
- HTTPS auto, sebab Cloudflare handle SSL.
- Free Cloudflare plan dah cukup untuk banyak use case homelab.
- Senang expose banyak subdomain untuk app berbeza.

Contoh subdomain:

```text
cv.loki-co.com
app.loki-co.com
todo.loki-co.com
api.loki-co.com
```

## Setup Cloudflare Tunnel

1. Beli domain, contoh `loki-co.com`.
2. Daftar akaun Cloudflare.
3. Add domain dalam Cloudflare.
4. Tukar nameserver domain ikut arahan Cloudflare.
5. Install `cloudflared` daemon dalam server.
6. Create tunnel dari server.
7. Route subdomain ke service local.

Contoh mapping:

```text
todo.loki-co.com -> http://localhost:5173
api.loki-co.com  -> http://localhost:3000
cv.loki-co.com   -> http://localhost:8080
```

Secara konsep, server rumah buat outbound connection ke Cloudflare. Bila orang buka subdomain, Cloudflare hantar traffic balik melalui tunnel tu.

## Free Alternative Tanpa Beli Domain

Kalau tujuan kau cuma nak test, tak wajib beli domain.

| Option | URL contoh | Best untuk |
| --- | --- | --- |
| Tailscale | `https://your-pc.tailxxxx.ts.net` | Private access, device sendiri/team kecil |
| Ngrok | `https://xxxx.ngrok.io` | Temporary demo/testing |
| Cloudflare Pages | `https://your-app.pages.dev` | Static frontend tanpa custom domain |

Nota:

- Tailscale best kalau app tu private.
- Ngrok best kalau nak share sementara.
- Cloudflare Pages best kalau website frontend static.
- Untuk production yang nampak proper, beli domain sendiri biasanya worth it.

## Quick Comparison

| Method | Cost | Need Public IP | Best For |
| --- | --- | --- | --- |
| Domain + A record | Domain lebih kurang USD 10/tahun | Yes | Production server dengan public IP |
| Cloudflare Tunnel | Domain lebih kurang USD 10/tahun | No | Homelab, self-hosted apps, server rumah |
| Ngrok | Free tier ada | No | Temporary testing/demo |
| Tailscale | Free tier ada | No | Private access |
| Cloudflare Pages subdomain | Free | No | Static website/frontend |

## Recommendation

Untuk setup macam Saleh, pilihan paling solid:

```text
Beli domain -> Add ke Cloudflare -> Guna Cloudflare Tunnel -> Expose subdomain ikut app
```

Kalau app masih testing:

```text
Ngrok untuk demo sementara
Tailscale untuk private access
Cloudflare Pages untuk static frontend
```

Kalau nak website nampak kemas dan production-ready, beli domain sendiri. Kos rendah, setup lebih proper, dan senang nak tambah subdomain kemudian.
