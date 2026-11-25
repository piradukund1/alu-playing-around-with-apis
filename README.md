# PhilFindsJobs

PhilFindsJobs is a job search website. Looking for work usually means checking many job boards one by one. PhilFindsJobs collects jobs from **two job boards (Arbeitnow and Remotive)** into one page, where you can search, filter, sort and save them, then apply on the original listing.

Built with plain **HTML, CSS and JavaScript** (no jQuery, no frameworks), hosted with **Nginx** on two web servers behind an **Nginx load balancer**.

| | |
|---|---|
| 🌐 **Live site (through the load balancer, Lb01)** | http://35.178.210.107 |
| 🖥️ **Web01 directly** | http://18.132.197.16 |
| 🖥️ **Web02 directly** | http://18.175.221.146 |
| 🎬 **Demo video** | [Watch the demo on YouTube](https://www.youtube.com/watch?v=rmXe_iuxU1I) |
| 💻 **Repository** | https://github.com/piradukund1/alu-playing-around-with-apis |

Server check links (each answers with the server's name):
[Lb01 → /server-info](http://35.178.210.107/server-info) · [Web01 → /server-info](http://18.132.197.16/server-info) · [Web02 → /server-info](http://18.175.221.146/server-info)


---

## Features

- **Search** by job title, skill, company or description
- **Location filter** (city, country, or type "remote" to see remote jobs)
- **Job type filter:** full-time, part-time, contract, internship, freelance
- **Tabs and navbar:** All jobs, Remote jobs, Saved jobs, About
- **Sort** by newest, oldest or company name (A–Z)
- **Details popup** with the full description and an *Apply on original site* button
- **Save jobs:** stored in the browser (localStorage); the whole job is saved, so it stays even after it leaves the API
- **Error handling:**
  - one API down → jobs from the other still show, with a message saying which one is not responding
  - both APIs down → "Couldn't reach the job providers" message and a *Refresh* button
  - a request that hangs is stopped after 15 seconds
  - invalid answers from an API are ignored
- **Caching:** results are kept for 30 minutes in the browser and 15 minutes on each web server, so the page loads fast and the APIs are not called on every visit
- **Security:** all API text is escaped before being shown (XSS protection), descriptions are shown as plain text, only `http/https` job links are allowed, search inputs are limited to 100 characters, and Nginx sends security headers and blocks hidden files (`.git`, `.env`)
- **"Served by Web01 / Web02"** in the footer shows which server answered
- **Docker (bonus):** the whole setup also runs in containers with `docker compose up` (see [Docker](#docker-bonus))

## Files

```
index.html         page layout (navbar, search, filters, job list, popup, footer)
style.css          design (dark theme, lime green accent)
app.js             all the logic (plain JavaScript)
nginx/web.conf     Nginx settings for Web01 and Web02
nginx/lb.conf      Nginx settings for the load balancer Lb01
scripts/setup.sh   one command to set up any of the three servers
Dockerfile         web server image for Docker (bonus)
docker-compose.yml runs Web01 + Web02 + load balancer in containers (bonus)
.dockerignore      files kept out of the Docker image
.gitignore         keeps secrets and scratch files out of the repo
```

---

## The APIs

| API | What it gives | Documentation |
|---|---|---|
| **Arbeitnow Job Board API** | Jobs mostly in Europe, some remote | https://www.arbeitnow.com/blog/job-board-api |
| **Remotive Remote Jobs API** | Remote jobs worldwide | https://remotive.com/remote-jobs/api · https://github.com/remotive-com/remote-jobs-api |

Both are free and need **no API key**.

### How the app uses them (`app.js`)

1. `loadJobs()` asks **both** APIs at the same time with `Promise.allSettled`, so one failing API doesn't stop the other.
2. `getJobs()` first calls **our own server** (`/api/arbeitnow/` and `/api/remotive/`). Nginx on Web01/Web02 forwards the request to the real API and caches the answer for 15 minutes. This also avoids browser CORS blocking. If the proxy isn't there (for example when running on your own computer), the app calls the API directly.
3. The two APIs use different field names, so `cleanJob()` turns every job into one simple shape: `id, title, company, location, type, remote, date, description, url, source`.
4. Jobs are cached in the browser for 30 minutes and shown with `show()`, which also applies the search, filters and sorting.

Example answers:

```js
// Arbeitnow:  https://www.arbeitnow.com/api/job-board-api
{ "data": [ { "title": "...", "company_name": "...", "location": "Berlin", "job_types": ["Full Time"], "remote": false, "url": "...", "created_at": 1763000000 } ] }

// Remotive:   https://remotive.com/api/remote-jobs?limit=100
{ "jobs": [ { "title": "...", "company_name": "...", "candidate_required_location": "Worldwide", "job_type": "full_time", "url": "...", "publication_date": "2026-11-20T08:00:00" } ] }
```

---

## Run it locally

You need a browser, Python 3 and an internet connection.

```bash
git clone https://github.com/piradukund1/alu-playing-around-with-apis.git
cd alu-playing-around-with-apis
python3 -m http.server 8080
```

Open **http://localhost:8080**. (Double-clicking `index.html` also works.)

Locally there is no Nginx proxy, so the browser calls the APIs directly, and the "Served by" badge does not appear.

---

## Deployment

### The servers

All three servers run **Ubuntu 20.04.6 LTS** (AWS, arm64) with **Nginx 1.18.0**.

| Server | Hostname | Role | IP address | Link |
|---|---|---|---|---|
| Web01 | `7295-web-01` | web server | `18.132.197.16` | http://18.132.197.16 |
| Web02 | `7295-web-02` | web server | `18.175.221.146` | http://18.175.221.146 |
| Lb01 | `7295-lb-01` | load balancer | `35.178.210.107` | http://35.178.210.107 |

I log in to each server with my SSH key:

```bash
ssh -i ~/.ssh/school ubuntu@18.132.197.16     # Web01
ssh -i ~/.ssh/school ubuntu@18.175.221.146    # Web02
ssh -i ~/.ssh/school ubuntu@35.178.210.107    # Lb01
```

### 1. Web01

```bash
ssh -i ~/.ssh/school ubuntu@18.132.197.16
sudo apt update && sudo apt install -y git
git clone https://github.com/piradukund1/alu-playing-around-with-apis.git
cd alu-playing-around-with-apis
sudo bash scripts/setup.sh Web01
```

Result:

```
==> Installing Nginx (if needed)
==> Copying website files to /var/www/PhilFindsJobs
==> Enabling the site, testing and reloading nginx
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
==> Checking
{"server":"Web01","status":"ok"}
Homepage: HTTP 200
Arbeitnow proxy: HTTP 200
Remotive proxy: HTTP 200
Done: Web01 is set up.
```

### 2. Web02

```bash
ssh -i ~/.ssh/school ubuntu@18.175.221.146
sudo apt update && sudo apt install -y git
git clone https://github.com/piradukund1/alu-playing-around-with-apis.git
cd alu-playing-around-with-apis
sudo bash scripts/setup.sh Web02
```

Result:

```
==> Checking
{"server":"Web02","status":"ok"}
Homepage: HTTP 200
Arbeitnow proxy: HTTP 200
Remotive proxy: HTTP 200
Done: Web02 is set up.
```

#### What `setup.sh` does on a web server

1. Installs Nginx if it is missing (it was already installed on Web01 and Web02).
2. Copies only `index.html`, `style.css` and `app.js` to `/var/www/PhilFindsJobs`, so the README, scripts and configs are not public.
3. Copies `nginx/web.conf` to `/etc/nginx/sites-available/PhilFindsJobs`, writing `Web01` or `Web02` in place of `WEB_NAME`, links it into `sites-enabled` and removes the old `default` site.
4. Checks the settings with `nginx -t`, reloads Nginx, then tests the homepage, `/server-info` and both API proxy routes.

#### What `nginx/web.conf` does

- **Serves the website** from `/var/www/PhilFindsJobs`.
- **API proxy:** `/api/arbeitnow/` and `/api/remotive/` forward to the real APIs and **cache** the answers for 15 minutes (`proxy_cache`). Only `GET` requests are allowed.
- **`/server-info`** replies `{"server":"Web01","status":"ok"}` (or Web02), and every response has an `X-Served-By` header, to prove load balancing.
- **Security headers** (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`), and hidden files are blocked.

### 3. Lb01 (load balancer)

Lb01 still had **HAProxy** running on port 80 from an earlier project:

```
LISTEN 0 2048 0.0.0.0:80 0.0.0.0:* users:(("haproxy",pid=6304,fd=6))
```

Only one program can use port 80, so I stopped and disabled HAProxy so Nginx could be the load balancer:

```bash
ssh -i ~/.ssh/school ubuntu@35.178.210.107
sudo systemctl stop haproxy
sudo systemctl disable haproxy
sudo apt update && sudo apt install -y git
git clone https://github.com/piradukund1/alu-playing-around-with-apis.git
cd alu-playing-around-with-apis
sudo bash scripts/setup.sh Lb01 18.132.197.16 18.175.221.146
```

The script installed Nginx 1.18.0, put the two web server IPs into `nginx/lb.conf`, installed it as `/etc/nginx/sites-available/PhilFindsJobs`, checked it with `nginx -t` and reloaded Nginx. Result:

```
==> Checking
{"server":"Web01","status":"ok"}
{"server":"Web02","status":"ok"}
{"server":"Web01","status":"ok"}
{"server":"Web02","status":"ok"}
{"server":"Web01","status":"ok"}
{"server":"Web02","status":"ok"}
Homepage: HTTP 200
Arbeitnow proxy: HTTP 200
Remotive proxy: HTTP 200
Done: Lb01 is set up.
```

#### The load balancer configuration (as installed on Lb01)

```nginx
upstream PhilFindsJobs_servers {
    # Round-robin; a server that fails 3 times is skipped for 30sec
    server 18.132.197.16:80 max_fails=3 fail_timeout=30s;    # Web01
    server 18.175.221.146:80 max_fails=3 fail_timeout=30s;   # Web02
}

server {
    listen 80 default_server;
    server_name _;

    location / {
        proxy_pass http://PhilFindsJobs_servers;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_next_upstream error timeout http_502 http_503 http_504;   # retry on the other server
        proxy_connect_timeout 3s;
        add_header X-Upstream $upstream_addr always;                    # shows which backend answered
    }
}
```

- **Round-robin:** requests go to Web01, then Web02, then Web01… (Nginx's default method).
- **Failover:** a server that fails 3 times is skipped for 30 seconds, and a failed request is retried on the other server, so users don't see errors.
- **Headers:** the visitor's real IP is passed to the web servers, and `X-Upstream` shows which server answered.

### Updating the site later

```bash
cd ~/alu-playing-around-with-apis && git pull && sudo bash scripts/setup.sh Web01   # Web02 on the second server
```

---

## Testing

### Traffic is balanced between both servers

From my laptop:

```bash
for i in 1 2 3 4 5 6; do curl -s http://35.178.210.107/server-info; echo; done
```

```
{"server":"Web01","status":"ok"}
{"server":"Web02","status":"ok"}
{"server":"Web01","status":"ok"}
{"server":"Web02","status":"ok"}
{"server":"Web01","status":"ok"}
{"server":"Web02","status":"ok"}
```

In the browser, refreshing http://35.178.210.107 switches the footer between **Served by Web01** and **Served by Web02**.

### Each server on its own

```bash
curl http://18.132.197.16/server-info     # {"server":"Web01","status":"ok"}
curl http://18.175.221.146/server-info    # {"server":"Web02","status":"ok"}
```

### Failover

```bash
ssh -i ~/.ssh/school ubuntu@18.132.197.16 'sudo systemctl stop nginx'     # turn Web01 off
for i in 1 2 3 4; do curl -s http://35.178.210.107/server-info; echo; done  # only Web02 answers, site stays up
ssh -i ~/.ssh/school ubuntu@18.132.197.16 'sudo systemctl start nginx'    # turn Web01 back on
```

### The app through the load balancer

On http://35.178.210.107 I checked: jobs load from both APIs, search, location filter, job type filter, sorting, the All/Remote/Saved tabs, the navbar links, the details popup, saving and removing a job, and the Apply links.

---

## Docker (bonus)

The same setup (Web01 + Web02 + load balancer) can also run in **Docker containers** on one computer. This is an extra; the live site on the real servers uses the normal Nginx setup above.

| File | What it does |
|---|---|
| `Dockerfile` | Builds the web server image: `nginx:alpine` + `index.html`, `style.css`, `app.js` + `nginx/web.conf`. `SERVER_NAME` (Web01 or Web02) is filled into the config when the container starts. |
| `docker-compose.yml` | Starts 3 containers: `web01`, `web02` (both from the Dockerfile) and `lb01` (`nginx:alpine` using `nginx/lb.conf`, with `web01` and `web02` as the two servers). |
| `.dockerignore` | Keeps the README, scripts and Git files out of the image. |

Run it (Docker Desktop must be running):

```bash
docker compose up -d --build      # build the image and start the 3 containers
docker compose ps                 # see web01, web02 and lb01 running
for i in 1 2 3 4; do curl -s http://localhost:8080/server-info; echo; done
docker compose down               # stop and remove the containers
```

Open **http://localhost:8080**: the app runs through the containerised load balancer, and the footer switches between **Served by Web01** and **Served by Web02**.

> `localhost:8080` only works on the computer running Docker. The public site is http://35.178.210.107 (the real servers).

### Results on my laptop (Docker Desktop, WSL)

`docker compose up -d --build` pulled `nginx:alpine`, built the web image and started the 3 containers:

```
 ✔ Image nginx:alpine                             Pulled
 ✔ Image alu-playing-around-with-apis-web01       Built
 ✔ Image alu-playing-around-with-apis-web02       Built
 ✔ Network alu-playing-around-with-apis_default   Created
 ✔ Container alu-playing-around-with-apis-web02-1 Started
 ✔ Container alu-playing-around-with-apis-web01-1 Started
 ✔ Container alu-playing-around-with-apis-lb01-1  Started
```

`docker compose ps`:

```
NAME                                   SERVICE   STATUS         PORTS
alu-playing-around-with-apis-lb01-1    lb01      Up 26 seconds  0.0.0.0:8080->80/tcp
alu-playing-around-with-apis-web01-1   web01     Up 29 seconds  80/tcp
alu-playing-around-with-apis-web02-1   web02     Up 27 seconds  80/tcp
```

The load balancer container sends requests to both web containers in turn (`X-Upstream` header):

```bash
for i in 1 2 3 4; do curl -s -D - -o /dev/null http://localhost:8080/server-info | grep -i x-upstream; done
```

```
X-Upstream: 172.18.0.3:80
X-Upstream: 172.18.0.2:80
X-Upstream: 172.18.0.3:80
X-Upstream: 172.18.0.2:80
```

And the web02 container correctly knows its name:

```bash
docker compose exec web02 sh -c 'echo NAME=$SERVER_NAME; grep "return 200" /etc/nginx/conf.d/default.conf'
```

```
NAME=Web02
        return 200 '{"server":"Web02","status":"ok"}';
```

Running one web server container on its own:

```bash
docker build -t philfindsjobs .
docker run -d -p 8081:80 -e SERVER_NAME=Web01 philfindsjobs    # open http://localhost:8081
```

---

## Challenges and solutions

1. **Typos that broke the servers.** A few small typos stopped everything: `http_5003` instead of `http_503` in `web.conf` and `$schema` instead of `$scheme` in `lb.conf` made `nginx -t` fail, and `for in` (missing `i`), `sites-enable` (missing `d`) and a missing `/` in a `sed` command broke `setup.sh`. **Solution:** I tested every file with `nginx -t` and `bash -n` before deploying, fixed the typos, and checked the server had the fixed version with `grep` before running the setup.
2. **HAProxy was using port 80 on Lb01.** Lb01 still had HAProxy from an earlier project, so Nginx couldn't use port 80. **Solution:** I found it with `sudo ss -tlnp | grep ':80 '`, then stopped and disabled HAProxy.
3. **The first setup run showed `404 Not Found`.** On Web01 and Lb01 the script checked `/server-info` right after reloading Nginx, while the old site was still answering. **Solution:** I checked that only my site was enabled (`ls /etc/nginx/sites-enabled/`), confirmed it answered correctly, and ran the setup again. Every check then passed.
4. **Browser blocking API calls (CORS).** Browsers can block a page from calling another website. **Solution:** an Nginx proxy on Web01 and Web02, so the browser only talks to its own server. The app falls back to calling the API directly when running locally.
5. **Different data from each API.** The field names differ, and the same job type is written `full_time` or `Full Time`, so the job type filter found nothing at first. **Solution:** `cleanJob()` converts every job to one shape, and `simpleType()` turns all job types into one format (`full-time`).
6. **Too many API requests.** Every visit called both APIs. **Solution:** caching in the browser (30 minutes) and on each web server (15 minutes).
7. **Docker typos and startup.** My first `docker-compose.yml` had `Web01:`/`Web02:` with capital letters (service names are case-sensitive, so `depends_on: [web01, web02]` failed with *"depends on undefined service"*) and `nginx:alphine` instead of `nginx:alpine` (*"not found"*). Docker Desktop's engine was also not running at first (*"failed to connect to the docker API"*). **Solution:** I found the mistakes with `cat -A docker-compose.yml`, fixed the names and the image, and started Docker Desktop until it showed "Engine running".
8. **Docker load balancer answered only Web01 at first.** Right after starting, web02 wasn't ready for the first request, so the load balancer marked it as failed and used only web01 for 30 seconds (`max_fails` / `fail_timeout=30s`). **Solution:** I checked the `X-Upstream` header, which showed both containers being used, and confirmed web02 was configured as `Web02`. After 30 seconds both servers were in rotation again.
9. **Proving load balancing.** Both servers serve the same page, so it was hard to see which one answered. **Solution:** a `/server-info` endpoint, an `X-Served-By` header and the "Served by" footer badge.

---

## Credits

- **Arbeitnow** (https://www.arbeitnow.com) and **Remotive** (https://remotive.com) for their free job APIs. Every job shows its source and links back to the original listing. Remotive's public feed is delayed by 24 hours.
- **Nginx** (https://nginx.org/en/docs/) for hosting, the API proxy, caching and load balancing ([load balancing guide](https://nginx.org/en/docs/http/load_balancing.html)).
- **Docker** (https://docs.docker.com) and the official `nginx:alpine` image.
- **Google Fonts:** Archivo and Inter Tight.
- **MDN Web Docs** (https://developer.mozilla.org) for Fetch, `<dialog>` and localStorage.
- Colour palette from my portfolio: https://iphil-kagaba-developer.vercel.app/

Job listings belong to their providers and employers. This is a student project and is not affiliated with Arbeitnow or Remotive.

## Author

**Philbert Iradukunda**, African Leadership University (ALU), Web Infrastructure summative: *Playing Around with APIs*
