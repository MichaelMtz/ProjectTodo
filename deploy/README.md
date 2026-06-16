# Deploy configs

Apache VirtualHost configs referenced by `../ToDo-AWS-Deployment-Plan.html`
(self-hosted Convex on AWS, behind your existing Apache box).

| File | Serves | Proxies / serves | Install path (Amazon Linux / httpd) |
| --- | --- | --- | --- |
| `convex-apache.conf` | `convex.yourdomain.com` | Reverse-proxies (incl. WebSocket upgrade) to the `convex-backend` container on `127.0.0.1:3310` (host 3310 → container 3210; avoids the sno-newsroom `:3210` conflict) | `/etc/httpd/conf.d/convex-todo.conf` |
| `todo-apache.conf` | `todo.yourdomain.com` | Static SPA from `/var/www/todo-notes-app/dist` with client-side routing fallback | `/etc/httpd/conf.d/todo-spa.conf` |

Both are the **HTTP-only** form. Run `certbot --apache -d <host>` after installing
each — Certbot adds the `:443` VirtualHost and the HTTP→HTTPS redirect.

Before reloading: replace `yourdomain.com` with your real domain, then
`httpd -t` (or `apache2ctl configtest`) and only reload if it reports `Syntax OK`.

See the full step-by-step in `../ToDo-AWS-Deployment-Plan.html`.
