



const APIS = [
    { name : "Arbeitnow", list: "data", proxy: "/api/arbeitnow/", direct: "https://www.arbeitnow.com/api/job-board-api" },
    { name: "Remotive", list: "jobs", proxy: "/api/remotive/?limit=100", direct: "https://remotive.com/api/remote-jobs?limit=100" }
];

const el = id => document.getElementById(id);
const load = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
const store = (key, value) => { try {localStorage.setItem(key, JSON.stringify(value));} catch {} };
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
            const res = await fetch(url, { signal: AbortSignal.timeout(15000)});
            const list = (await res.json())[api.list];
            if (res.ok && Array.isArray(list)) return list.map(j => cleanJob(j, api.name));
        } catch {}
    }
    throw new Error(api.name + "failed"); 
}

async function loadJobs(refresh) {
    el("message").hidden = true;
    const cache = load("cache");
    if (!refresh && cache && Date.now() - cache.time < 30 * 60000 ) { jobs = cache.jobs; return show(); }

}