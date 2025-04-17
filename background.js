const DEFAULT_FREE_DAYS = 2;
const BLOCK_KEYWORD_RULE_ID = 1;

// Redirect‑Regel für Keyword "porn" auf unsere blocked.html
const blockKeywordRule = {
  id: BLOCK_KEYWORD_RULE_ID,
  priority: 1,
  action: {
    type: "redirect",
    redirect: { url: chrome.runtime.getURL("blocked.html") },
  },
  condition: {
    urlFilter: "porn",
    resourceTypes: ["main_frame", "sub_frame"],
  },
};

function generateRandomFreeDays(count) {
  const days = [0, 1, 2, 3, 4, 5, 6],
    free = [];
  for (let i = 0; i < count && days.length; i++) {
    free.push(days.splice(Math.floor(Math.random() * days.length), 1)[0]);
  }
  return free;
}

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

function updateTodayRules() {
  const today = new Date().getDay();
  chrome.storage.sync.get(["freeDays", "blockedSites"], (data) => {
    const freeDays = data.freeDays || [],
      userSites = data.blockedSites || [];
    fetch(chrome.runtime.getURL("blocked_sites.json"))
      .then((r) => r.json())
      .then((def) =>
        applyRules(freeDays, today, Array.from(new Set([...def, ...userSites])))
      )
      .catch((_) => applyRules(freeDays, today, userSites));
  });

  function applyRules(free, today, sites) {
    chrome.declarativeNetRequest.getDynamicRules((rules) => {
      const removeIds = rules.map((r) => r.id);
      chrome.declarativeNetRequest.updateDynamicRules(
        { removeRuleIds: removeIds, addRules: [] },
        () => {
          if (!free.includes(today)) {
            const siteRules = sites.map((site, i) => ({
              id: 1000 + i,
              priority: 1,
              action: {
                type: "redirect",
                redirect: { url: chrome.runtime.getURL("blocked.html") },
              },
              condition: {
                urlFilter: site,
                resourceTypes: ["main_frame", "sub_frame"],
              },
            }));
            chrome.declarativeNetRequest.updateDynamicRules({
              addRules: [blockKeywordRule, ...siteRules],
            });
          }
        }
      );
    });
  }
}

function updateWeeklyFreeDays() {
  chrome.storage.sync.get(
    ["freeDaysCount", "freeDaysWeek", "freeDays"],
    (data) => {
      const cnt = data.freeDaysCount ?? DEFAULT_FREE_DAYS;
      const now = new Date(),
        week = `${now.getFullYear()}-${getWeekNumber(now)}`;
      if (
        !data.freeDays ||
        data.freeDays.length !== cnt ||
        data.freeDaysWeek !== week
      ) {
        const free = generateRandomFreeDays(cnt);
        chrome.storage.sync.set(
          { freeDays: free, freeDaysWeek: week },
          updateTodayRules
        );
      } else updateTodayRules();
    }
  );
}

// INSTALL & ALARM
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("dailyCheck", { periodInMinutes: 1440 });
  updateWeeklyFreeDays();
});
chrome.alarms.onAlarm.addListener(
  (a) => a.name === "dailyCheck" && updateWeeklyFreeDays()
);

// MESSAGE
chrome.runtime.onMessage.addListener((msg, s, r) => {
  if (msg.action === "updateWeeklyFreeDays") {
    updateWeeklyFreeDays();
    r({ ok: true });
  }
});
