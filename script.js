const tiobe = [
  { rank: 1, name: "Python", rating: 21.81, change: -2.08 },
  { rank: 2, name: "C", rating: 11.05, change: 1.22 },
  { rank: 3, name: "C++", rating: 8.55, change: -2.82 },
  { rank: 4, name: "Java", rating: 8.12, change: -2.54 },
  { rank: 5, name: "C#", rating: 6.83, change: 2.71 },
  { rank: 6, name: "JavaScript", rating: 2.92, change: -0.85 },
  { rank: 7, name: "Visual Basic", rating: 2.85, change: 0.81 },
  { rank: 8, name: "R", rating: 2.19, change: 1.14 },
  { rank: 9, name: "SQL", rating: 1.93, change: -0.93 },
  { rank: 10, name: "Delphi/Object Pascal", rating: 1.88, change: -0.29 },
  { rank: 11, name: "Perl", rating: 1.67, change: 1.19 },
  { rank: 12, name: "Fortran", rating: 1.64, change: -0.12 },
  { rank: 13, name: "PHP", rating: 1.34, change: 0.20 },
  { rank: 14, name: "Rust", rating: 1.32, change: -0.14 },
  { rank: 15, name: "Scratch", rating: 1.30, change: -0.25 },
  { rank: 16, name: "Go", rating: 1.23, change: -1.03 },
  { rank: 17, name: "Ada", rating: 1.14, change: 0.43 },
  { rank: 18, name: "MATLAB", rating: 1.13, change: 0.14 },
  { rank: 19, name: "Assembly language", rating: 1.10, change: 0.15 },
  { rank: 20, name: "Kotlin", rating: 1.05, change: 0.29 }
];

const el = (id) => document.getElementById(id);

function fmtPct(n) {
  return `${n.toFixed(2)}%`;
}

function trendChip(change) {
  const up = change > 0;
  const dir = up ? "up" : "down";
  const arrow = up ? "▲" : "▼";
  const abs = Math.abs(change).toFixed(2);
  return `<span class="trend ${dir}">${arrow} ${abs}%</span>`;
}

function renderTable(rows) {
  const body = el("tiobeBody");
  body.innerHTML = rows.map(r => `
    <tr>
      <td>#${r.rank}</td>
      <td>${r.name}</td>
      <td>${fmtPct(r.rating)}</td>
      <td>${trendChip(r.change)}</td>
    </tr>
  `).join("");
}

function sortRows(rows, mode) {
  const copy = [...rows];
  if (mode === "rank") copy.sort((a,b) => a.rank - b.rank);
  if (mode === "rating") copy.sort((a,b) => b.rating - a.rating);
  if (mode === "name") copy.sort((a,b) => a.name.localeCompare(b.name, "pt-BR"));
  return copy;
}

function filterRows(rows, q) {
  const s = q.trim().toLowerCase();
  if (!s) return rows;
  return rows.filter(r => r.name.toLowerCase().includes(s));
}

function initTiobe() {
  const search = el("searchLang");
  const sortBy = el("sortBy");
  const resetBtn = el("resetBtn");

  const update = () => {
    const rows = filterRows(sortRows(tiobe, sortBy.value), search.value);
    renderTable(rows);
  };

  search.addEventListener("input", update);
  sortBy.addEventListener("change", update);
  resetBtn.addEventListener("click", () => {
    search.value = "";
    sortBy.value = "rank";
    update();
  });

  update();
}

function initTabs() {
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const panels = {
    dados: el("tab-dados"),
    web: el("tab-web"),
    auto: el("tab-auto"),
    devops: el("tab-devops"),
    edu: el("tab-edu")
  };

  const activate = (key) => {
    tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === key));
    Object.entries(panels).forEach(([k, node]) => node.classList.toggle("active", k === key));
  };

  tabs.forEach(t => t.addEventListener("click", () => activate(t.dataset.tab)));
}

function initCopy() {
  const btn = el("copyBtn");
  const block = el("codeBlock");
  const original = btn.textContent;

  btn.addEventListener("click", async () => {
    const text = block.innerText.trim();
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "Copiado ✔";
      setTimeout(() => (btn.textContent = original), 1200);
    } catch {
      btn.textContent = "Falhou ✖";
      setTimeout(() => (btn.textContent = original), 1200);
    }
  });
}

function initSendToConsole() {
  const btn = el("sendToConsoleBtn");
  const block = el("codeBlock");
  const editor = el("pyEditor");
  if (!btn || !block || !editor) return;

  btn.addEventListener("click", () => {
    editor.value = block.innerText.trim();
    location.hash = "#console";
  });
}

function initMobileNav() {
  const btn = el("menuBtn");
  const nav = el("mobileNav");
  btn.addEventListener("click", () => {
    const open = nav.style.display === "block";
    nav.style.display = open ? "none" : "block";
  });
  nav.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => (nav.style.display = "none"));
  });
}

let pyodideInstance = null;

function setPyStatus(text, state) {
  const status = el("pyStatus");
  const dot = el("pyDot");
  if (status) status.textContent = text;
  if (dot) {
    dot.classList.remove("ok", "bad");
    if (state === "ok") dot.classList.add("ok");
    if (state === "bad") dot.classList.add("bad");
  }
}

function appendOut(text) {
  const out = el("pyOut");
  if (!out) return;
  out.textContent += text;
  out.scrollTop = out.scrollHeight;
}

function setOut(text) {
  const out = el("pyOut");
  if (!out) return;
  out.textContent = text;
  out.scrollTop = out.scrollHeight;
}

async function initPy() {
  const runBtn = el("runPyBtn");
  setPyStatus("Carregando Python...", "");
  try {
    pyodideInstance = await loadPyodide();
    setPyStatus("Python pronto", "ok");
    if (runBtn) runBtn.disabled = false;
  } catch {
    setPyStatus("Falha ao carregar Python", "bad");
    if (runBtn) runBtn.disabled = true;
  }
}

async function runPython() {
  const editor = el("pyEditor");
  if (!pyodideInstance || !editor) return;

  const code = editor.value;

  const runBtn = el("runPyBtn");
  if (runBtn) runBtn.disabled = true;

  try {
    const wrapped = `
import sys, io, traceback
_buf = io.StringIO()
_old_out, _old_err = sys.stdout, sys.stderr
sys.stdout = _buf
sys.stderr = _buf

_globals = {"__name__": "__main__"}

try:
    exec(${JSON.stringify(code)}, _globals)
except Exception:
    traceback.print_exc()

sys.stdout, sys.stderr = _old_out, _old_err
_buf.getvalue()
`;
    const out = await pyodideInstance.runPythonAsync(wrapped);
    appendOut((out || "") + (out && !out.endsWith("\n") ? "\n" : ""));
  } catch (e) {
    appendOut(String(e) + "\n");
  } finally {
    if (runBtn) runBtn.disabled = false;
  }
}

function initConsoleUI() {
  const runBtn = el("runPyBtn");
  const clearBtn = el("clearOutBtn");
  const resetBtn = el("resetPyBtn");

  if (runBtn) runBtn.addEventListener("click", runPython);
  if (clearBtn) clearBtn.addEventListener("click", () => setOut(""));
  if (resetBtn) resetBtn.addEventListener("click", () => {
    const editor = el("pyEditor");
    if (editor) {
      editor.value = `print("Olá! Python rodando no navegador.")
for i in range(1, 4):
    print("i =", i)`;
    }
    setOut("");
  });
}

initTiobe();
initTabs();
initCopy();
initSendToConsole();
initMobileNav();
initConsoleUI();
initPy();