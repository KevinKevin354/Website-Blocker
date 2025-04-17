document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("freeDaysList");
  const btn = document.getElementById("openSettings");
  const names = [
    "Sonntag",
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
  ];

  chrome.storage.sync.get("freeDays", (data) => {
    list.innerHTML = "";
    const d = data.freeDays || [];
    if (!d.length) {
      list.innerHTML = "<li>Keine freien Tage.</li>";
    } else {
      d.forEach((i) => {
        const li = document.createElement("li");
        li.textContent = names[i];
        list.appendChild(li);
      });
    }
  });

  btn.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
  });
});
