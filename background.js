chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg.text == "tabId?") {
    sendResponse({ tab: sender.tab.id });
  }
});
chrome.runtime.onInstalled.addListener(function() {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostContains: "kktix.com" },
            css: [".ticket-list"]
          })
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()]
      }
    ]);
  });
});
