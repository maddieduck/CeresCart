// Save data to storage
function saveToLocalStorage(key, value) {
    chrome.storage.sync.set({ [key]: value }, () => {
      //console.log(`Data saved: ${key} - ${value}`);
    });
}

function loadFromLocalStorage(key) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(key, (result) => {
        resolve(result[key]);
      });
    });
  }

export{saveToLocalStorage, loadFromLocalStorage}