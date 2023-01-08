document.getElementById("button").addEventListener("click", function() {
    chrome.runtime.sendMessage({message: "clear_all"});
});