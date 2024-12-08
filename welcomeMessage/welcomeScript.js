document.getElementById('mailing-list-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const email = this.querySelector('input').value;
    if (email) {
        alert(`Thank you for subscribing, ${email}!`);
        // Optionally send the email to your backend here
        this.reset();
    } else {
        alert('Please enter a valid email address.');
    }
});
