class TwoPlayer {
    constructor() {
        this.blocks = Array(9).fill('');
        this.mode = 'x';
        this.cells = document.querySelectorAll('.cell');
        this.message = document.querySelector('.message p');
        this.resultOverlay = document.getElementById('result-overlay');
        this.resultTitle = document.getElementById('result-title');
        this.resultDetail = document.getElementById('result-detail');
        this.fullResultScreen = document.getElementById('full-result-screen');
        this.fullResultTitle = document.getElementById('full-result-title');
        this.fullResultDetail = document.getElementById('full-result-detail');
        this.timerLabel = document.getElementById('turn-timer');
        this.timeLeft = 30;
        this.timer = null;
        this.reset = document.getElementById('reset');
        this.restartTimer = null;
        this.storageKey = 'nexus-two-player';
        this.state = JSON.parse(localStorage.getItem(this.storageKey) || '{"x":0,"o":0,"history":[]}');
        this.soundOn = false;
        this.nameInputs = { x: document.getElementById('player-x'), o: document.getElementById('player-o') };
        this.addEventListeners();
        this.restoreSettings();
        this.renderScore();
        this.startTimer();
        this.stopTimer();
        this.setupNameGate();
    }

    addEventListeners() {
        this.cells.forEach((cell, index) => cell.addEventListener('click', () => this.play(index)));
        this.reset.addEventListener('click', () => this.resetGame());
        Object.entries(this.nameInputs).forEach(([mark, input]) => input.addEventListener('input', () => {
            this.state.names = this.state.names || {};
            this.state.names[mark] = input.value.trim() || `Player ${mark.toUpperCase()}`;
            this.saveState(); this.renderScore(); this.updateTurnMessage();
        }));
        document.getElementById('theme').addEventListener('change', event => { document.documentElement.dataset.theme = event.target.value; localStorage.setItem('nexus-theme', event.target.value); });
        document.getElementById('sound-toggle').addEventListener('click', event => {
            this.soundOn = !this.soundOn;
            event.currentTarget.setAttribute('aria-pressed', String(this.soundOn));
            event.currentTarget.innerHTML = `<i class="fa-solid fa-volume-${this.soundOn ? 'high' : 'xmark'}" aria-hidden="true"></i> Sound ${this.soundOn ? 'on' : 'off'}`;
        });
    }

    play(index) {
        if (this.blocks[index] || this.isGameOver()) return;
        this.placeMove(index, this.mode); this.playSound('begin.mp3');
        const line = this.winningLine();
        if (line) return this.finish(this.mode, line);
        if (this.blocks.every(Boolean)) return this.finish('draw');
        this.mode = this.mode === 'x' ? 'o' : 'x'; this.updateTurnMessage(); this.startTimer();
    }

    placeMove(index, mark) { this.blocks[index] = mark; this.cells[index].textContent = mark; this.cells[index].classList.add(mark, 'cell-placed'); }

    finish(mark, line) {
        const box = document.querySelector('.game-box');
        if (mark === 'draw') {
            this.stopTimer(); box.classList.add('game-draw'); this.message.textContent = "It's a draw!"; this.showResult('DRAW GAME', 'No winning line this round.'); this.playSound('tie.m4a'); this.recordResult('Draw');
        } else {
            this.stopTimer(); line.forEach(index => this.cells[index].classList.add('winner')); box.classList.add('game-won');
            this.message.textContent = `${this.name(mark)} wins!`; this.showResult(`${this.name(mark).toUpperCase()} WINS`, 'Victory confirmed / new round loading'); this.state[mark] += 1; this.recordResult(this.name(mark)); this.playSound('confetty.mp3');
        }
        this.saveState(); this.scheduleNewRound();
    }

    winningLine() { return [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].find(([a,b,c]) => this.blocks[a] && this.blocks[a] === this.blocks[b] && this.blocks[a] === this.blocks[c]); }
    isGameOver() { return Boolean(this.winningLine()) || this.blocks.every(Boolean); }
    name(mark) { return this.state.names?.[mark] || `Player ${mark.toUpperCase()}`; }
    updateTurnMessage() { this.message.textContent = `${this.name(this.mode)}'s turn`; }
    recordResult(result) { this.state.history = [result, ...(this.state.history || [])].slice(0, 5); this.renderScore(); }
    playSound(file) { if (this.soundOn) new Audio(`./assests/tune/${file}`).play().catch(() => {}); }
    saveState() { localStorage.setItem(this.storageKey, JSON.stringify(this.state)); }

    resetGame() {
        window.clearTimeout(this.restartTimer); this.blocks.fill(''); this.mode = 'x';
        this.cells.forEach(cell => { cell.textContent = ''; cell.classList.remove('x', 'o', 'cell-placed', 'winner'); });
        document.querySelector('.game-box').classList.remove('game-won', 'game-draw'); this.hideResult(); this.updateTurnMessage(); this.startTimer();
    }

    scheduleNewRound() { this.restartTimer = window.setTimeout(() => { this.resetGame(); this.message.textContent = `New round started - ${this.name('x')}'s turn`; }, 3000); }
    showResult(title, detail) { this.resultTitle.textContent = title; this.resultDetail.textContent = detail; this.fullResultTitle.textContent = title; this.fullResultDetail.textContent = detail; this.resultOverlay.classList.add('is-visible'); this.resultOverlay.setAttribute('aria-hidden', 'false'); this.fullResultScreen.className = `full-result-screen is-visible${title.includes('DRAW') ? ' draw-state' : ''}`; this.fullResultScreen.setAttribute('aria-hidden', 'false'); }
    hideResult() { this.resultOverlay.classList.remove('is-visible'); this.resultOverlay.setAttribute('aria-hidden', 'true'); this.fullResultScreen.className = 'full-result-screen'; this.fullResultScreen.setAttribute('aria-hidden', 'true'); }
    startTimer() { this.stopTimer(); this.timeLeft = 30; this.renderTimer(); this.timer = window.setInterval(() => { this.timeLeft -= 1; this.renderTimer(); if (this.timeLeft <= 0) this.timeout(); }, 1000); }
    setupNameGate() {
        const gate = document.getElementById('name-gate');
        const input = document.getElementById('start-name');
        const savedName = this.state.names?.x || '';
        input.value = savedName;
        const start = () => {
            const name = input.value.trim();
            if (!name) return input.focus();
            this.state.names = this.state.names || {};
            this.state.names.x = name;
            this.nameInputs.x.value = name;
            this.saveState();
            this.renderScore();
            gate.classList.add('is-hidden');
            this.startTimer();
            this.updateTurnMessage();
        };
        document.getElementById('start-match').addEventListener('click', start);
        input.addEventListener('keydown', event => { if (event.key === 'Enter') start(); });
        input.focus();
    }
    stopTimer() { window.clearInterval(this.timer); this.timer = null; }
    renderTimer() { this.timerLabel.textContent = this.timeLeft; this.timerLabel.classList.toggle('warning', this.timeLeft <= 5); }
    timeout() { if (this.isGameOver()) return; this.stopTimer(); const winner = this.mode === 'x' ? 'o' : 'x'; const loser = this.name(this.mode); const winnerName = this.name(winner); document.querySelector('.game-box').classList.add('game-won'); this.message.textContent = `${loser} ran out of time`; this.showResult(`${winnerName.toUpperCase()} WINS`, `${loser} ran out of time / new round loading`); this.state[winner] += 1; this.recordResult(winnerName); this.playSound('loss.mp3'); this.saveState(); this.scheduleNewRound(); }
    restoreSettings() {
        const names = this.state.names || { x: 'Player X', o: 'Player O' }; this.nameInputs.x.value = names.x; this.nameInputs.o.value = names.o;
        const theme = localStorage.getItem('nexus-theme') || 'nexus'; document.documentElement.dataset.theme = theme; document.getElementById('theme').value = theme;
    }
    renderScore() {
        document.getElementById('score-x').textContent = this.state.x || 0; document.getElementById('score-o').textContent = this.state.o || 0;
        document.getElementById('score-name-x').textContent = this.name('x'); document.getElementById('score-name-o').textContent = this.name('o');
        document.getElementById('history').innerHTML = (this.state.history?.length ? this.state.history : ['No rounds played yet']).map(item => `<li>${item}</li>`).join('');
    }
}