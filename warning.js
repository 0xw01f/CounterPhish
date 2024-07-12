document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get('reason');
    const domain = params.get('domain');
    let message = '';

    if (reason === 'blacklist') {
        message = `The site "${domain}" has been blacklisted due to potential security risks.`;
    } else if (reason === 'typosquatting') {
        message = `The site "${domain}" has been blocked due to potential typosquatting.`;
    } else {
        message = `The site "${domain}" has been blocked for security reasons.`;
    }

    document.getElementById('warningMessage').textContent = message;
});