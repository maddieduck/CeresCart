// Save data to storage
function saveToLocalStorage(key, value) {
    chrome.storage.local.set({ [key]: value }, () => {
      //console.log(`Data saved: ${key} - ${value}`);
    });
}

function loadFromLocalStorage(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key]);
      });
    });
  }

export{saveToLocalStorage, loadFromLocalStorage}