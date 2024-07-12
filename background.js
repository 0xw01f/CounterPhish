let baseWhitelist = [];
let baseBlacklist = [];
let userWhitelist = [];
let userBlacklist = [];
let removedDomains = [];

function loadLists() {
  Promise.all([
    fetch(chrome.runtime.getURL('lists/whitelist.json')).then(response => response.json()),
    fetch(chrome.runtime.getURL('lists/blacklist.json')).then(response => response.json()),
    new Promise(resolve => chrome.storage.sync.get(['userWhitelist', 'userBlacklist', 'removedDomains'], resolve))
  ]).then(([whitelistData, blacklistData, storageData]) => {
    baseWhitelist = whitelistData;
    baseBlacklist = blacklistData;
    userWhitelist = storageData.userWhitelist || [];
    userBlacklist = storageData.userBlacklist || [];
    removedDomains = storageData.removedDomains || [];
    updateStorage();
  });
}

function updateStorage() {
  chrome.storage.sync.set({
    userWhitelist: userWhitelist,
    userBlacklist: userBlacklist,
    removedDomains: removedDomains
  });
}

function addDomain(list, domain) {
  if (list === 'whitelist') {
    if (!userWhitelist.includes(domain) && !baseWhitelist.includes(domain)) {
      userWhitelist.push(domain);
    }
    removedDomains = removedDomains.filter(d => d !== domain);
  } else if (list === 'blacklist') {
    if (!userBlacklist.includes(domain) && !baseBlacklist.includes(domain)) {
      userBlacklist.push(domain);
    }
    removedDomains = removedDomains.filter(d => d !== domain);
  }
  updateStorage();
}

function removeDomain(list, domain) {
  if (list === 'whitelist') {
    userWhitelist = userWhitelist.filter(d => d !== domain);
    if (baseWhitelist.includes(domain)) {
      removedDomains.push(domain);
    }
  } else if (list === 'blacklist') {
    userBlacklist = userBlacklist.filter(d => d !== domain);
    if (baseBlacklist.includes(domain)) {
      removedDomains.push(domain);
    }
  }
  updateStorage();
}

function isInWhitelist(domain) {
  return (baseWhitelist.includes(domain) && !removedDomains.includes(domain)) || userWhitelist.includes(domain);
}

function isInBlacklist(domain) {
  return (baseBlacklist.includes(domain) && !removedDomains.includes(domain)) || userBlacklist.includes(domain);
}

function isTypoSquatting(domain) {
  const allWhitelistDomains = [...baseWhitelist, ...userWhitelist].filter(d => !removedDomains.includes(d));
  return allWhitelistDomains.some(trustedDomain => {
    
    // Check if the domain is a typo of a trusted domain, 2 is the maximum distance allowed
    // Example with distance 2: "goggle.com" -> "google.com" or "gogle.com" -> "google.com"
    return levenshteinDistance(domain, trustedDomain) <= 2 && domain !== trustedDomain;
  });
}


// levenstein distance algorithm : https://en.wikipedia.org/wiki/Levenshtein_distance
// basically it calculates the minimum number of single-character edits (insertions, deletions, or substitutions) required to change one word into the other.
// for example, the distance between "kitten" and "sitting" is 3, since the following three edits change one into the other, and there is no way to do it with fewer than three edits:
//! Might not be te best option for this as it can give false positives, but it's a good start (I guess)

function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    const url = new URL(details.url);
    const domain = url.hostname;

    if (isInWhitelist(domain)) {
      return {cancel: false};
    }

    if (isInBlacklist(domain)) {
      console.log(`Blocked blacklisted site: ${domain}`);
      return {redirectUrl: chrome.runtime.getURL("warning.html") + "?reason=blacklist&domain=" + encodeURIComponent(domain)};
    }

    if (isTypoSquatting(domain)) {
      console.log(`Blocked potential typo squatting: ${domain}`);
      return {redirectUrl: chrome.runtime.getURL("warning.html") + "?reason=typosquatting&domain=" + encodeURIComponent(domain)};
    }

    return {cancel: false};
  },
  {urls: ["<all_urls>"]},
  ["blocking"]
);

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.action === "addToWhitelist") {
      addDomain('whitelist', request.domain);
      sendResponse({success: true});
    } else if (request.action === "addToBlacklist") {
      addDomain('blacklist', request.domain);
      sendResponse({success: true});
    } else if (request.action === "removeFromWhitelist") {
      removeDomain('whitelist', request.domain);
      sendResponse({success: true});
    } else if (request.action === "removeFromBlacklist") {
      removeDomain('blacklist', request.domain);
      sendResponse({success: true});
    } else if (request.action === "getLists") {
      const whitelist = [...baseWhitelist, ...userWhitelist].filter(d => !removedDomains.includes(d));
      const blacklist = [...baseBlacklist, ...userBlacklist].filter(d => !removedDomains.includes(d));
      sendResponse({whitelist: whitelist, blacklist: blacklist});
    }
    return true;
  }
);

// Load lists when the extension starts
loadLists();