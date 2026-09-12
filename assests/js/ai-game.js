class AIPlayer {
    constructor() {
        this.blocks = Array(9).fill(''); this.cells = document.querySelectorAll('.cell'); this.message = document.querySelector('.message p'); this.resultOverlay = document.getElementById('result-overlay'); this.resultTitle = document.getElementById('result-title'); this.resultDetail = document.getElementById('result-detail'); this.fullResultScreen = document.getElementById('full-result-screen'); this.fullResultTitle = document.getElementById('full-result-title'); this.fullResultDetail = document.getElementById('full-result-detail'); this.timerLabel = document.getElementById('turn-timer'); this.timeLeft = 30; this.timer = null; this.reset = document.getElementById('reset'); this.thinking = false; this.restartTimer = null; this.storageKey = 'nexus-ai-player'; this.state = JSON.parse(localStorage.getItem(this.storageKey) || '{"x":0,"o":0,"history":[]}'); this.soundOn = false; this.nameInputs = { x: document.getElementById('player-x'), o: document.getElementById('player-o') }; this.difficulty = document.getElementById('difficulty');
        this.addEventListeners(); this.restoreSettings(); this.renderScore(); this.startTimer(); this.stopTimer(); this.setupNameGate();
    }
    addEventListeners() {
        this.cells.forEach((cell, index) => cell.addEventListener('click', () => this.playerMove(index))); this.reset.addEventListener('click', () => this.resetGame());
        Object.entries(this.nameInputs).forEach(([mark, input]) => input.addEventListener('input', () => { this.state.names = this.state.names || {}; this.state.names[mark] = input.value.trim() || (mark === 'x' ? 'You' : 'Nexus AI'); this.saveState(); this.renderScore(); }));
        this.difficulty.addEventListener('change', () => { this.state.difficulty = this.difficulty.value; this.saveState(); });
        document.getElementById('theme').addEventListener('change', event => { document.documentElement.dataset.theme = event.target.value; localStorage.setItem('nexus-theme', event.target.value); });
        document.getElementById('sound-toggle').addEventListener('click', event => { this.soundOn = !this.soundOn; event.currentTarget.setAttribute('aria-pressed', String(this.soundOn)); event.currentTarget.innerHTML = `<i class="fa-solid fa-volume-${this.soundOn ? 'high' : 'xmark'}" aria-hidden="true"></i> Sound ${this.soundOn ? 'on' : 'off'}`; });
    }
    playerMove(index) {
        if (this.thinking || this.blocks[index] || this.isGameOver()) return; this.placeMove(index, 'x'); this.playSound('begin.mp3'); if (this.finishIfNeeded('x')) return;
        this.thinking = true; this.stopTimer(); this.message.textContent = `${this.name('o')} is thinking...`; document.querySelector('.game-box').classList.add('ai-thinking');
        window.setTimeout(() => { this.placeMove(this.bestMove(), 'o'); this.thinking = false; document.querySelector('.game-box').classList.remove('ai-thinking'); if (!this.finishIfNeeded('o')) { this.message.textContent = `${this.name('x')}'s turn`; this.startTimer(); } }, 420);
    }
    placeMove(index, mark) { this.blocks[index] = mark; this.cells[index].textContent = mark; this.cells[index].classList.add(mark, 'cell-placed'); }
    finishIfNeeded(mark) {
        const line = this.winningLine();
        if (line) { line.forEach(index => this.cells[index].classList.add('winner')); document.querySelector('.game-box').classList.add('game-won'); const playerWon = mark === 'x'; this.message.textContent = playerWon ? `${this.name('x')} beat the AI!` : `${this.name('o')} wins.`; this.showResult(playerWon ? 'YOU WIN' : 'SYSTEM WIN', playerWon ? 'Nexus core defeated / new round loading' : 'The machine found the line / new round loading'); this.state[mark] += 1; this.recordResult(this.name(mark)); this.playSound(playerWon ? 'confetty.mp3' : 'loss.mp3'); this.saveState(); this.scheduleNewRound(); return true; }
        if (this.blocks.every(Boolean)) { document.querySelector('.game-box').classList.add('game-draw'); this.message.textContent = "It's a draw!"; this.showResult('DRAW GAME', 'The core remains undecided / new round loading'); this.recordResult('Draw'); this.playSound('tie.m4a'); this.saveState(); this.scheduleNewRound(); return true; }
        return false;
    }
    winningLine() { return [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].find(([a,b,c]) => this.blocks[a] && this.blocks[a] === this.blocks[b] && this.blocks[a] === this.blocks[c]); }
    isGameOver() { return Boolean(this.winningLine()) || this.blocks.every(Boolean); }
    bestMove() {
        const empty = this.blocks.map((value, index) => value ? -1 : index).filter(index => index >= 0);
        if (this.difficulty.value === 'easy') return empty[Math.floor(Math.random() * empty.length)];
        if (this.difficulty.value === 'medium' && Math.random() < .45) return empty[Math.floor(Math.random() * empty.length)];
        let bestScore = -Infinity; let move = empty[0];
        this.blocks.forEach((block, index) => { if (block) return; this.blocks[index] = 'o'; const score = this.minimax(false); this.blocks[index] = ''; if (score > bestScore) { bestScore = score; move = index; } });
        return move;
    }
    minimax(aiTurn) { const line = this.winningLine(); if (line) return this.blocks[line[0]] === 'o' ? 1 : -1; if (this.blocks.every(Boolean)) return 0; const scores = []; this.blocks.forEach((block, index) => { if (block) return; this.blocks[index] = aiTurn ? 'o' : 'x'; scores.push(this.minimax(!aiTurn)); this.blocks[index] = ''; }); return aiTurn ? Math.max(...scores) : Math.min(...scores); }
    resetGame() { window.clearTimeout(this.restartTimer); this.blocks.fill(''); this.thinking = false; this.cells.forEach(cell => { cell.textContent = ''; cell.classList.remove('x', 'o', 'cell-placed', 'winner'); }); document.querySelector('.game-box').classList.remove('game-won', 'game-draw', 'ai-thinking'); this.hideResult(); this.message.textContent = `${this.name('x')}'s turn`; this.startTimer(); }
    scheduleNewRound() { this.restartTimer = window.setTimeout(() => { this.resetGame(); this.message.textContent = 'New round started - Your turn'; }, 3000); }
    showResult(title, detail) { this.resultTitle.textContent = title; this.resultDetail.textContent = detail; this.fullResultTitle.textContent = title; this.fullResultDetail.textContent = detail; this.resultOverlay.classList.add('is-visible'); this.resultOverlay.setAttribute('aria-hidden', 'false'); const stateClass = title.includes('DRAW') ? 'draw-state' : (title === 'SYSTEM WIN' ? 'loss-state' : ''); this.fullResultScreen.className = `full-result-screen is-visible ${stateClass}`; this.fullResultScreen.setAttribute('aria-hidden', 'false'); }
    hideResult() { this.resultOverlay.classList.remove('is-visible'); this.resultOverlay.setAttribute('aria-hidden', 'true'); this.fullResultScreen.className = 'full-result-screen'; this.fullResultScreen.setAttribute('aria-hidden', 'true'); }
    startTimer() { this.stopTimer(); this.timeLeft = 30; this.renderTimer(); this.timer = window.setInterval(() => { this.timeLeft -= 1; this.renderTimer(); if (this.timeLeft <= 0) this.timeout(); }, 1000); }
    setupNameGate() {
        const gate = document.getElementById('name-gate');
        const input = document.getElementById('start-name');
        input.value = this.state.names?.x || '';
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
            this.message.textContent = `${name}'s turn`;
        };
        document.getElementById('start-match').addEventListener('click', start);
        input.addEventListener('keydown', event => { if (event.key === 'Enter') start(); });
        input.focus();
    }
    stopTimer() { window.clearInterval(this.timer); this.timer = null; }
    renderTimer() { this.timerLabel.textContent = this.timeLeft; this.timerLabel.classList.toggle('warning', this.timeLeft <= 5); }
    timeout() { if (this.thinking || this.isGameOver()) return; this.stopTimer(); document.querySelector('.game-box').classList.add('game-won'); this.message.textContent = `${this.name('x')} ran out of time`; this.showResult('SYSTEM WIN', `${this.name('x')} ran out of time / new round loading`); this.state.o += 1; this.recordResult(this.name('o')); this.playSound('loss.mp3'); this.saveState(); this.scheduleNewRound(); }
    recordResult(result) { this.state.history = [result, ...(this.state.history || [])].slice(0, 5); this.renderScore(); }
    name(mark) { return this.state.names?.[mark] || (mark === 'x' ? 'You' : 'Nexus AI'); }
    playSound(file) { if (this.soundOn) new Audio(`./assests/tune/${file}`).play().catch(() => {}); }
    saveState() { localStorage.setItem(this.storageKey, JSON.stringify(this.state)); }
    restoreSettings() { const names = this.state.names || {}; this.nameInputs.x.value = names.x || 'You'; this.nameInputs.o.value = names.o || 'Nexus AI'; this.difficulty.value = this.state.difficulty || 'medium'; const theme = localStorage.getItem('nexus-theme') || 'nexus'; document.documentElement.dataset.theme = theme; document.getElementById('theme').value = theme; }
    renderScore() { document.getElementById('score-x').textContent = this.state.x || 0; document.getElementById('score-o').textContent = this.state.o || 0; document.getElementById('score-name-x').textContent = this.name('x'); document.getElementById('score-name-o').textContent = this.name('o'); document.getElementById('history').innerHTML = (this.state.history?.length ? this.state.history : ['No rounds played yet']).map(item => `<li>${item}</li>`).join(''); }
}