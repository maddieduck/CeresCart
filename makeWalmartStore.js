console.log('makewalmartStore running');
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('fromExtension') === 'true') {
    var button = document.querySelector('button[aria-label="Make this my store"]');
    if (button) {
        button.click();
        console.log('Button clicked successfully!');
    } else {
        console.error('Error: Button not found. Cannot change store. ');
    } 
    // Close the window
    setTimeout(() => {
        window.close();
    }, 1500); 
}