document.addEventListener('DOMContentLoaded', function() {
    const domainInput = document.getElementById('domainInput');
    const addToWhitelistBtn = document.getElementById('addToWhitelist');
    const addToBlacklistBtn = document.getElementById('addToBlacklist');
    const whitelistDisplay = document.getElementById('whitelistDisplay');
    const blacklistDisplay = document.getElementById('blacklistDisplay');
  
    function updateLists() {
      chrome.runtime.sendMessage({action: "getLists"}, function(response) {
        whitelistDisplay.innerHTML = response.whitelist.map(domain => 
          `<li> <span class="remove" data-list="whitelist" data-domain="${domain}">❌</span> ${domain}</li>`
        ).join('');
        blacklistDisplay.innerHTML = response.blacklist.map(domain => 
          `<li> <span class="remove" data-list="blacklist" data-domain="${domain}">❌</span> ${domain}</li>`
        ).join('');
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.remove').forEach(btn => {
          btn.addEventListener('click', removeDomain);
        });
      });
    }
  
    function addDomain(list) {
      const domain = domainInput.value.trim();
      if (domain) {
        chrome.runtime.sendMessage({action: `addTo${list}`, domain: domain}, updateLists);
        domainInput.value = '';
      }
    }
  
    function removeDomain(event) {
      const list = event.target.dataset.list;
      const domain = event.target.dataset.domain;
      chrome.runtime.sendMessage({action: `removeFrom${list.charAt(0).toUpperCase() + list.slice(1)}`, domain: domain}, updateLists);
    }
  
    addToWhitelistBtn.addEventListener('click', () => addDomain('Whitelist'));
    addToBlacklistBtn.addEventListener('click', () => addDomain('Blacklist'));
  
    updateLists();
  });