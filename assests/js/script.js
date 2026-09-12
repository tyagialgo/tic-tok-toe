document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('loaded');

    const muteButton = document.getElementById('mute');
    const audio = new Audio('./assests/tune/welcome.mp3');
    audio.preload = 'none';
    audio.loop = true;

    muteButton.addEventListener('click', () => {
        if (audio.paused) {
            audio.play().catch(() => {});
            muteButton.innerHTML = '<i class="fa fa-volume-up" aria-hidden="true"></i>';
            muteButton.setAttribute('aria-label', 'Turn sound off');
        } else {
            audio.pause();
            muteButton.innerHTML = '<i class="fa fa-volume-mute" aria-hidden="true"></i>';
            muteButton.setAttribute('aria-label', 'Turn sound on');
        }
    });

    document.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => stopConfetti());
    });
});