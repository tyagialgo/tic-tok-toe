function getRandomColor(){
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

var sound;

function startConfetti() {
    sound = new Audio('./assests/tune/confetty.mp3');
    sound.play();
    const confetti = document.getElementById('confetti-container');

    for(let i = 0 ;i < 100 ; i++){
        const confettiPiece = document.createElement('div');
        confettiPiece.classList.add('confetti');
        confettiPiece.style.backgroundColor = getRandomColor();
        confettiPiece.style.left = Math.random() * 100 + 'vw';
        confettiPiece.style.animationDuration = Math.random() * 10 + 1 + 's';
        confetti.appendChild(confettiPiece);
    }
}

function stopConfetti() {
    const confetti = document.getElementById('confetti-container');
    confetti.innerHTML = '';
}

