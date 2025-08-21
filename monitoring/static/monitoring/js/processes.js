// ===== config (from template) =====
const { GET_URL, CLEAR_URL } = window.__PM_CONFIG__ || {
  GET_URL: "/api/processes/",
  // FIX: default CLEAR endpoint should be /api/processes/clear/
  CLEAR_URL: "/api/processes/clear/"
};

const DETECT_URL = '/api/processes/collect/'; // POST
const FETCH_URL = '/api/processes/';          // GET
let latestData = [];


// ===== DOM refs =====
const elHost = document.getElementById("hostname");
const elSearch = document.getElementById("search");
const elRefresh = document.getElementById("btn-refresh");
const elDetect = document.getElementById("btn-detect-host");
const elAuto = document.getElementById("auto-toggle");
const elInterval = document.getElementById("interval");
const elClear = document.getElementById("btn-clear");
const elContainer = document.getElementById("process-container");
const elStatus = document.getElementById("status");
const elStatusText = document.getElementById("status-text");
const elLast = document.getElementById("last-updated");
const elToast = document.getElementById("toast");

let timer = null;
// let latestData = [];

// ===== helpers =====
const fmtTime = d => new Date(d).toLocaleTimeString();

function setStatus(ok, msg){
  elStatus.querySelector(".dot")?.classList.remove("dot-ok","dot-bad","dot-muted");
  const dot = elStatus.querySelector(".dot") || (() => {
    const s = document.createElement("span"); s.className = "dot"; elStatus.prepend(s); return s;
  })();
  dot.classList.add(ok === true ? "dot-ok" : ok === false ? "dot-bad" : "dot-muted");
  elStatusText.textContent = msg || "";
}

function toast(msg, ms=2200){
  elToast.textContent = msg;
  elToast.classList.add("show");
  setTimeout(() => elToast.classList.remove("show"), ms);
}

function debounce(fn, ms=250){
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ===== fetch & render =====
async function fetchProcesses(){
  const hostname = elHost.value.trim();
  const url = GET_URL; // Backends often ignore ?hostname; filter client-side for robustness.

  elContainer.innerHTML = `
    <div class="empty"><div class="spinner"></div><p>Loading processes…</p></div>
  `;
  setStatus(null, "Fetching…");

  try{
    const res = await fetch(url, { headers:{ "Accept":"application/json" }});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    let data = await res.json();
    if (!Array.isArray(data)) data = [];

    // Client-side hostname filter (works even if backend doesn't implement ?hostname=)
    const filteredByHost = hostname ? data.filter(d => (d.hostname || "").toLowerCase() === hostname.toLowerCase()) : data;

    latestData = filteredByHost;
    render(latestData, elSearch.value.trim());
    setStatus(true, `Loaded ${latestData.length} rows`);
    elLast.textContent = `Updated ${fmtTime(Date.now())}`;
  }catch(err){
    setStatus(false, `Error loading data (${err.message})`);
    elContainer.innerHTML = `
      <div class="empty">
        <p>Failed to load processes.</p>
        <small class="hint">Check if the Django server is running and agent posted data.</small>
      </div>
    `;
  }
}

function buildTree(rows){
  const map = new Map();
  rows.forEach(p => {
    const pid = Number(p.pid);
    if (!Number.isFinite(pid)) return;
    map.set(pid, { ...p, children: [] });
  });

  const roots = [];
  rows.forEach(p => {
    const pid = Number(p.pid);
    const ppid = p.parent_pid != null ? Number(p.parent_pid) : null;
    const node = map.get(pid);
    if (!node) return;

    if(Number.isFinite(ppid) && map.has(ppid)){
      map.get(ppid).children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function filterRows(rows, q){
  if(!q) return rows;
  const s = q.toLowerCase();
  return rows.filter(r =>
    String(r.pid ?? "").toLowerCase().includes(s) ||
    String(r.parent_pid ?? "").toLowerCase().includes(s) ||
    (r.name || "").toLowerCase().includes(s) ||
    (r.hostname || "").toLowerCase().includes(s)
  );
}

function render(rows, query=""){
  const filtered = filterRows(rows, query);
  const roots = buildTree(filtered);
  if(roots.length === 0){
    elContainer.innerHTML = `
      <div class="empty">
        <p>No processes found${query ? ` for “${query}”` : ""}.</p>
        <small class="hint">Try clearing the search or refresh.</small>
      </div>
    `;
    return;
  }

  const ul = document.createElement("ul");
  ul.className = "tree-list";
  roots.forEach(r => ul.appendChild(renderNode(r)));
  elContainer.innerHTML = "";
  elContainer.appendChild(ul);
}

function renderNode(proc){
  const li = document.createElement("li");
  li.className = "node";

  const row = document.createElement("button");
  row.className = "row";
  row.setAttribute("type","button");
  row.setAttribute("aria-expanded","false");

  const caret = document.createElement("span");
  caret.className = "caret";
  caret.textContent = (proc.children && proc.children.length) ? "▶" : "•";

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = proc.name || "unknown";

  const cpu = Number(proc.cpu_usage ?? 0);
  const mem = Number(proc.memory_usage ?? 0);

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `
    <span class="chip">PID <span class="kbd">${proc.pid ?? "-"}</span></span>
    ${proc.parent_pid ? `<span class="chip">PPID <span class="kbd">${proc.parent_pid}</span></span>` : ""}
    <span class="chip">CPU <span class="kbd">${Number.isFinite(cpu) ? cpu.toFixed(1) : "0.0"}%</span></span>
    <span class="chip">MEM <span class="kbd">${Number.isFinite(mem) ? mem.toFixed(1) : "0.0"}%</span></span>
    <span class="chip">Host <span class="kbd">${proc.hostname || "-"}</span></span>
  `;

  row.appendChild(caret);
  row.appendChild(name);
  row.appendChild(meta);
  li.appendChild(row);

  if(proc.children && proc.children.length){
    const ul = document.createElement("ul");
    ul.className = "tree-list";
    ul.style.display = "none";
    proc.children.sort((a,b) => (a.name || "").localeCompare(b.name || ""));
    proc.children.forEach(ch => ul.appendChild(renderNode(ch)));
    li.appendChild(ul);

    // Toggle expand/collapse
    row.addEventListener("click", () => {
      const open = ul.style.display === "none";
      ul.style.display = open ? "block" : "none";
      row.classList.toggle("expanded", open);
      row.setAttribute("aria-expanded", String(open));
      if (open) caret.textContent = "▼"; else caret.textContent = "▶";
    });

    // Keyboard controls
    row.addEventListener("keydown", (e) => {
      if(["Enter"," "].includes(e.key)){ e.preventDefault(); row.click(); }
      if(e.key === "ArrowRight" && ul.style.display === "none"){ e.preventDefault(); row.click(); }
      if(e.key === "ArrowLeft"  && ul.style.display !== "none"){ e.preventDefault(); row.click(); }
    });
  } else {
    // Leaf nodes: keep focus handling safe
    row.addEventListener("keydown", (e) => {
      if(["Enter"," "].includes(e.key)){ e.preventDefault(); }
    });
  }

  return li;
}

// ===== actions =====
// elRefresh.addEventListener("click", fetchProcesses);

// Live filter as you type
elSearch.addEventListener("input", debounce(() => render(latestData, elSearch.value.trim()), 200));

// Single, consolidated Detect listener (removed duplicates)

let isCollecting = false; // flag to prevent multiple simultaneous collects

// Detect button: collect live processes
elDetect.addEventListener('click', async () => {
  if (isCollecting) return; // ignore if already collecting

  isCollecting = true;
  elDetect.disabled = true;
  elDetect.textContent = "Collecting...";

  try {
    const res = await fetch(`/api/processes/collect/`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      toast(`Live snapshot collected (${data.count} processes)`);
      await fetchProcesses(); // fetch and render immediately
    } else {
      toast(`Failed to collect: ${res.status}`);
    }
  } catch (err) {
    console.error(err);
    toast('Network error while collecting processes');
  } finally {
    isCollecting = false;
    elDetect.disabled = false;
    elDetect.textContent = "Detect"; // reset button label
  }
});

// Refresh button: fetch latest stored processes
elRefresh.addEventListener('click', async () => {
  fetchProcesses();
});

// Function to fetch and render processes
async function fetchProcesses() {
  try {
    const res = await fetch(`/api/processes/`);
    if (res.ok) {
      latestData = await res.json();
      if (latestData.length === 0) {
        toast('No process data yet. Click Detect first.');
      }
      render(latestData, elSearch.value.trim());
    } else {
      toast(`Failed to fetch data: ${res.status}`);
    }
  } catch (err) {
    console.error(err);
    toast('Network error while fetching processes');
  }
}

// Optional: auto-fetch on page load
fetchProcesses();


elClear.addEventListener("click", async () => {
  if(!confirm("This will DELETE all process rows. Continue?")) return;

  try{
    const res = await fetch(`/api/processes/clear/`, { method: "DELETE" });

    // log the actual response for debugging
    console.log(res.status, res.ok);

    if(res.ok){  // res.ok is true for 200-299
      toast("All data cleared");
      latestData = [];
      render(latestData, elSearch.value.trim());
      setStatus(true, "Cleared");
    }else{
      toast(`Failed to clear (status ${res.status})`);
      setStatus(false, "Clear failed");
    }
  }catch(err){
    console.error(err);
    toast("Failed to clear (network)");
  }
});

function startAuto(){
  stopAuto();
  if(!elAuto.checked) return;
  const sec = Math.max(2, Number(elInterval.value) || 10); // guard against bad input
  timer = setInterval(fetchProcesses, sec * 1000);
}
function stopAuto(){ if(timer){ clearInterval(timer); timer=null; } }

elAuto.addEventListener("change", () => {
  if(elAuto.checked) toast("Auto-refresh ON");
  else toast("Auto-refresh OFF");
  startAuto();
});
elInterval.addEventListener("change", startAuto);

// ===== init =====
window.addEventListener("DOMContentLoaded", () => {
  // Restore last hostname/search
  const savedHost = sessionStorage.getItem("pm_host") || "";
  const savedQuery = sessionStorage.getItem("pm_q") || "";
  if(savedHost) elHost.value = savedHost;
  if(savedQuery) elSearch.value = savedQuery;

  elHost.addEventListener("change", () => sessionStorage.setItem("pm_host", elHost.value.trim()));
  elSearch.addEventListener("change", () => sessionStorage.setItem("pm_q", elSearch.value.trim()));

  fetchProcesses();
  startAuto();
});
