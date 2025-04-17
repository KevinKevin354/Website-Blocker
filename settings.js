document.addEventListener("DOMContentLoaded", () => {
  const tFree = document.getElementById("tabFreeDays"),
    tBlock = document.getElementById("tabBlockedSites"),
    cFree = document.getElementById("freeDaysTab"),
    cBlock = document.getElementById("blockedSitesTab");

  function show(tab) {
    if (tab === "free") {
      cFree.classList.add("active");
      cBlock.classList.remove("active");
      tFree.classList.add("active");
      tBlock.classList.remove("active");
    } else {
      cBlock.classList.add("active");
      cFree.classList.remove("active");
      tBlock.classList.add("active");
      tFree.classList.remove("active");
    }
  }
  tFree.onclick = () => show("free");
  tBlock.onclick = () => show("block");

  // Freie Tage
  const sel = document.getElementById("freeDaysCount");
  chrome.storage.sync.get(
    "freeDaysCount",
    (d) => (sel.value = d.freeDaysCount ?? 2)
  );
  document.getElementById("saveFreeDays").onclick = () => {
    chrome.storage.sync.set({ freeDaysCount: parseInt(sel.value) }, () => {
      chrome.runtime.sendMessage({ action: "updateWeeklyFreeDays" });
      alert("Gespeichert!");
    });
  };

  // Blocklist
  function host(u) {
    try {
      if (!u.startsWith("http")) u = "https://" + u;
      return new URL(u).hostname.replace(/^www\./, "");
    } catch {
      return u;
    }
  }
  function name(h) {
    const p = h.split(".");
    const b = p[p.length - 2] || h;
    return b.charAt(0).toUpperCase() + b.slice(1);
  }
  function refresh() {
    const ul = document.getElementById("blockedSitesList");
    ul.innerHTML = "";
    Promise.all([
      fetch(chrome.runtime.getURL("blocked_sites.json")).then((r) => r.json()),
      new Promise((r) =>
        chrome.storage.sync.get("blockedSites", (d) => r(d.blockedSites || []))
      ),
    ]).then(([def, user]) => {
      const map = new Map();
      def.forEach((u) => map.set(host(u), true));
      user.forEach((u) => map.set(host(u), false));
      map.forEach((isDef, h) => {
        const li = document.createElement("li");
        li.className = "blocked-site";
        const img = document.createElement("img");
        img.src = `https://www.google.com/s2/favicons?sz=32&domain=${h}`;
        img.className = "favicon";
        const sp = document.createElement("span");
        sp.textContent = name(h);
        li.append(img, sp);
        if (!isDef) {
          const btn = document.createElement("button");
          btn.textContent = "✖";
          btn.className = "remove";
          btn.onclick = () => {
            chrome.storage.sync.get("blockedSites", (d) => {
              const arr = (d.blockedSites || []).filter((x) => host(x) !== h);
              chrome.storage.sync.set({ blockedSites: arr }, refresh);
            });
          };
          li.append(btn);
        }
        ul.append(li);
      });
    });
  }
  document.getElementById("addBlockedSite").onclick = () => {
    const inp = document.getElementById("newBlockedSite"),
      h = host(inp.value.trim());
    if (!h) return;
    chrome.storage.sync.get("blockedSites", (d) => {
      const arr = d.blockedSites || [];
      if (!arr.includes(h)) {
        arr.push(h);
        chrome.storage.sync.set({ blockedSites: arr }, () => {
          inp.value = "";
          refresh();
        });
      }
    });
  };
  refresh();
});
