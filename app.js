//PhilFindsJobs: get jobs from Api and let the user search, filter,sort and save them.



const APIS = [
    { name: "Arbeitnow", list: "data", proxy: "/api/arbeitnow/", direct: "https://www.arbeitnow.com/api/job-board-api" },
    { name: "Remotive", list: "jobs", proxy: "/api/remotive/?limit=100", direct: "https://remotive.com/api/remote-jobs?limit=100" }
];

const el = id => document.getElementById(id);
const load = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
const store = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { } };
const simpleType = t => String(t).toLowerCase().replace(/[\s_]+/g, "-");
const niceType = t => simpleType(t).replace(/^./, c => c.toUpperCase());
const safe = t => String(t ?? "").replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";");

let jobs = [], saved = load("saved") || [], tab = "all", openJob = null;


function cleanJob(j, source) {
    const arbeitnow = source === "Arbeitnow";
    return {
        id: source + "-" + (j.slug || j.id), source, title: j.title, url: j.url,
        company: j.company_name || "Unknown company", description: j.description || "",
        location: (arbeitnow ? j.location : j.candidate_required_location) || "Remote",
        type: (arbeitnow ? (j.job_types || []).map(niceType).join(", ") : niceType(j.job_type || "")) || "Not specified",
        remote: arbeitnow ? j.remote === true : true,
        date: arbeitnow ? j.created_at * 1000 || 0 : new Date(j.publication_date).getTime() || 0
    };
}


async function getJobs(api) {
    const urls = location.protocol.startsWith("http") ? [api.proxy, api.direct] : [api.direct];
    for (const url of urls) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
            if (!res.ok) continue;
            const data = await res.json();
            const list = data[api.list];

            if (Array.isArray(list)) {
                return list.map(j => cleanJob(j, api.name));
            }

        } catch { }
    }
    throw new Error(api.name + " failed");
}


async function loadJobs(refresh) {
    el("message").hidden = true;
    const cache = load("cache");
    if (!refresh && cache && Date.now() - cache.time < 30 * 60000) { jobs = cache.jobs; return show(); }

    el("count").textContent = "Loading jobs...";
    const results = await Promise.allSettled(APIS.map(getJobs)); // one failing Api does not stop the others
    const failed = APIS.filter((_, i) => results[i].status === "rejected").map(a => a.name);
    jobs = results.flatMap(r => r.value || []).filter(j => j.title && /^https?:\/\//.test(j.url)); // only safe links

    if (!jobs.length) {
        el("count").textContent = "No jobs loaded";
        el("jobs").innerHTML = "";
        return message("Couldn't reach the job providers. Check your internet and press Refresh.");
    }
    if (failed.length) message(failed.join(" and ") + " is not responding, so some jobs may be missing.");
    store("cache", { time: Date.now(), jobs });
    show();
}

function message(text) { el("message").textContent = text; el("message").hidden = false; }

// Search + filters + sorting, then draw the job cards
function show() {
    const word = el("keyword").value.trim().toLowerCase(), place = el("place").value.trim().toLowerCase();
    const type = el("type").value, sort = el("sort").value;
    const list = (tab === "saved" ? saved : jobs).filter(j =>
        (j.title + " " + j.company + " " + j.description).toLowerCase().includes(word) &&
        (!place ||
            String(j.location || "").toLowerCase().includes(place) ||
            (place === "remote" && j.remote)
        ) &&
        simpleType(j.type).includes(type) &&
        (tab !== "remote" || j.remote)
    ).sort((a, b) => sort === "company" ? a.company.localeCompare(b.company) : sort === "oldest" ? a.date - b.date : b.date - a.date);

    el("savedCount").textContent = saved.length;
    el("count").textContent = list.length + (list.length === 1 ? "job found" : " jobs found");
    el("jobs").innerHTML = list.length ? list.map(j => `
        <article class="job-card">
            <div class="job-top">
            <div><h3>${safe(j.title)}</h3><p class="muted">${safe(j.company)}</p></div>
            <button class="save ${isSaved(j.id) ? "saved" : ""}" data-save="${safe(j.id)}" title="Save">★</button>
            </div>
            <p class="muted">📍 ${safe(j.location)} · ${safe(j.type)} · ${j.date ? new Date(j.date).toLocaleDateString() : "No date"}</p>
            <div class="tags">${j.remote ? '<span class="tag">Remote</span>' : ""}<span class="tag source">${j.source}</span></div>
            <div class="job-actions">
                <button class="btn btn-outline" data-details="${safe(j.id)}">Details</button>
                <a class="btn" href="${safe(j.url)}" target="_blank" rel="noopener">Apply ↗</a>
            </div>
            </article>`).join("") : '<p class="muted">No jobs match. Try other words or press Clear.</p>';
}


//saved jobs -- the whole jobs are stored in the browser , so it stays even if it leaves the api
const isSaved = id => saved.some(j => j.id === id);
function toggleSave(id) {
    saved = isSaved(id) ? saved.filter(j => j.id !== id) : [...saved, jobs.find(j => j.id === id)].filter(Boolean);
    store("saved", saved);
    show();
    if (openJob) el("dialogSave").textContent = isSaved(openJob.id) ? "★ Saved" : "☆ Save job";
}

//details popup (description shown as plain text only, for safety)
function openDetails(id) {
    openJob = [...jobs, ...saved].find(j => j.id === id);
    el("dialogSource").textContent = "From " + openJob.source;
    el("dialogTitle").textContent = openJob.title;
    el("dialogInfo").textContent = `${openJob.company} · ${openJob.location} · ${openJob.type}`;
    el("dialogText").textContent = new DOMParser().parseFromString(openJob.description, "text/html").body.textContent.trim() || "see the original listing.";
    el("dialogApply").href = openJob.url;
    el("dialogSave").textContent = isSaved(id) ? "★ Saved" : "☆ Save job";
    el("dialog").showModal();
}

function setTab(name) {
    tab = name;
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
    show();
}

//buttons and inputs
["keyword", "place", "type", "sort"].forEach(id => el(id).addEventListener("input", show));
el("searchForm").addEventListener("submit", e => { e.preventDefault(); show(); });
document.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => setTab(b.dataset.tab)));
el("clear").addEventListener("click", () => { ["keyword", "place", "type"].forEach(id => (el(id).value = "")); el("sort").value = "newest"; setTab("all"); });
el("refresh").addEventListener("click", () => loadJobs(true));
el("jobs").addEventListener("click", e => {
    const s = e.target.closest("[data-save]"), d = e.target.closest("[data-details]");
    if (s) toggleSave(s.dataset.save);
    if (d) openDetails(d.dataset.details);
});
el("dialogSave").addEventListener("click", () => toggleSave(openJob.id));
el("closeDialog").addEventListener("click", () => el("dialog").close());

//footer to server web01 or web02 - proves looad balancer works

fetch("/server-info").then(r => r.json()).then(d => (el("server").textContent = "Served by " + d.server)).catch(() => { });

loadJobs(false);