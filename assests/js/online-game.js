class OnlineGame {
    constructor() {
        this.cells = document.querySelectorAll('.cell');
        this.status = document.getElementById('online-status');
        this.nameInput = document.getElementById('online-name');
        this.roomInput = document.getElementById('room-code');
        this.roomDisplay = document.getElementById('room-display');
        this.roomId = document.getElementById('room-id');
        this.fullResultScreen = document.getElementById('full-result-screen');
        this.fullResultTitle = document.getElementById('full-result-title');
        this.fullResultDetail = document.getElementById('full-result-detail');
        this.blocks = Array(9).fill('');
        this.turn = 'x';
        this.role = null;
        this.connection = null;
        this.peer = null;
        this.round = 1;
        this.scores = { x: 0, o: 0, draw: 0 };
        this.soundOn = false;
        this.autoResetTimer = null;
        this.ended = false;
        this.timeLeft = 30;
        this.timer = null;
        this.bindEvents();
        this.readInviteLink();
        const theme = localStorage.getItem('nexus-theme') || 'nexus';
        document.documentElement.dataset.theme = theme;
        document.getElementById('theme').value = theme;
        this.setupNameGate();
    }

    bindEvents() {
        this.cells.forEach((cell, index) => cell.addEventListener('click', () => this.play(index)));
        document.getElementById('host-room').addEventListener('click', () => this.hostRoom());
        document.getElementById('join-room').addEventListener('click', () => this.joinRoom());
        document.getElementById('copy-room').addEventListener('click', () => this.copyInvite());
        document.getElementById('reset').addEventListener('click', () => this.newGame());
        document.getElementById('sound-toggle').addEventListener('click', event => {
            this.soundOn = !this.soundOn;
            event.currentTarget.setAttribute('aria-pressed', String(this.soundOn));
            event.currentTarget.innerHTML = `<i class="fa-solid fa-volume-${this.soundOn ? 'high' : 'xmark'}" aria-hidden="true"></i> Sound ${this.soundOn ? 'on' : 'off'}`;
        });
        document.getElementById('theme').addEventListener('change', event => {
            document.documentElement.dataset.theme = event.target.value;
            localStorage.setItem('nexus-theme', event.target.value);
        });
    }

    setupNameGate() {
        const gate = document.getElementById('name-gate');
        const input = document.getElementById('start-name');
        const start = () => {
            const name = input.value.trim();
            if (!name) return input.focus();
            this.nameInput.value = name;
            localStorage.setItem('nexus-online-name', name);
            gate.classList.add('is-hidden');
        };
        input.value = localStorage.getItem('nexus-online-name') || '';
        document.getElementById('start-match').addEventListener('click', start);
        input.addEventListener('keydown', event => { if (event.key === 'Enter') start(); });
        input.focus();
    }

    hostRoom() {
        this.role = 'host';
        this.setStatus('Creating room...');
        this.peer = new Peer();
        this.peer.on('open', id => {
            this.roomId.textContent = id;
            this.roomDisplay.hidden = false;
            this.setStatus('Room ready. Waiting for your friend...');
        });
        this.peer.on('connection', connection => this.attachConnection(connection));
        this.peer.on('error', error => this.setStatus(`Connection error: ${error.type}`));
    }

    readInviteLink() {
        const room = new URLSearchParams(window.location.search).get('room');
        if (room) {
            this.roomInput.value = room;
            this.setStatus('Invite loaded. Enter your name and join.');
            this.roomInput.focus();
        }
    }

    async copyInvite() {
        const room = this.roomId.textContent;
        const invite = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(room)}`;
        try {
            await navigator.clipboard.writeText(invite);
            this.setStatus('Invite link copied. Send it to your friend anywhere.');
            document.getElementById('copy-room').innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Copied';
            window.setTimeout(() => { document.getElementById('copy-room').innerHTML = '<i class="fa-regular fa-copy" aria-hidden="true"></i> Copy code'; }, 1800);
        } catch (error) {
            this.setStatus(`Send this invite link: ${invite}`);
        }
    }

    joinRoom() {
        const room = this.roomInput.value.trim();
        if (!room) return this.setStatus('Enter a room code first.');
        this.role = 'guest';
        this.setStatus('Joining room...');
        this.peer = new Peer();
        this.peer.on('open', () => this.attachConnection(this.peer.connect(room)));
        this.peer.on('error', error => this.setStatus(`Connection error: ${error.type}`));
    }

    attachConnection(connection) {
        this.connection = connection;
        connection.on('open', () => {
            this.setStatus(this.role === 'host' ? 'Friend connected. Your turn.' : 'Connected. Waiting for host...');
            if (this.role === 'host') connection.send({ type: 'state', board: this.blocks, turn: this.turn, round: this.round, scores: this.scores });
            else connection.send({ type: 'hello', name: this.nameInput.value.trim() || 'Guest' });
            this.startTimer();
        });
        connection.on('data', message => this.receive(message));
        connection.on('close', () => {
            if (this.connection === connection) this.setStatus('Friend disconnected. Room closed.');
        });
        connection.on('error', () => {
            if (this.connection === connection) this.setStatus('Connection interrupted.');
        });
    }

    play(index) {
        if (!this.connection?.open || this.blocks[index] || this.turn !== this.roleMark() || this.isOver()) return;
        this.applyMove(index, this.roleMark());
        this.playSound('begin.mp3');
        this.connection.send({ type: 'move', index, mark: this.roleMark() });
        this.checkResult();
    }

    receive(message) {
        if (message.type === 'hello' && this.role === 'host') {
            this.setStatus(`${message.name} connected. Your turn.`);
            this.connection.send({ type: 'state', board: this.blocks, turn: this.turn });
        }
        if (message.type === 'state') {
            this.blocks = message.board;
            this.turn = message.turn;
            this.ended = false;
            this.round = message.round || this.round;
            this.scores = message.scores || this.scores;
            this.renderRound();
            this.renderBoard();
            this.startTimer();
            this.setStatus(this.turn === this.roleMark() ? 'Your turn.' : 'Friend is thinking...');
        }
        if (message.type === 'move') {
            this.applyMove(message.index, message.mark);
            this.playSound('begin.mp3');
            this.turn = message.mark === 'x' ? 'o' : 'x';
            this.checkResult();
            if (!this.isOver()) { this.startTimer(); this.setStatus(this.turn === this.roleMark() ? 'Your turn.' : 'Friend is thinking...'); }
        }
        if (message.type === 'reset') {
            this.resetBoard();
            this.hideResult();
            this.round = message.round || this.round + 1;
            this.scores = message.scores || this.scores;
            this.ended = false;
            this.renderRound();
            this.startTimer();
            this.setStatus('New game started. Host plays first.');
        }
        if (message.type === 'timeout') {
            this.stopTimer();
            this.ended = true;
            this.scores = message.scores || this.scores;
            const won = message.winner === this.roleMark();
            this.renderRound();
            this.setStatus(won ? 'You win on time!' : 'You lose on time.');
            this.showResult(won ? 'YOU WIN' : 'YOU LOSE', won ? 'Opponent ran out of time / new game loading' : 'Your time expired / new game loading', won ? '' : 'loss-state');
        }
    }

    applyMove(index, mark) {
        this.blocks[index] = mark;
        this.cells[index].textContent = mark;
        this.cells[index].classList.add(mark, 'cell-placed');
        this.turn = mark === 'x' ? 'o' : 'x';
    }

    checkResult() {
        if (this.ended) return true;
        const line = this.winningLine();
        if (line) {
            this.stopTimer();
            this.ended = true;
            line.forEach(index => this.cells[index].classList.add('winner'));
            const won = this.blocks[line[0]] === this.roleMark();
            const winner = this.blocks[line[0]];
            this.setStatus(won ? 'You win the game!' : 'You lose the game.');
            this.scores[winner] += 1;
            this.playSound(won ? 'confetty.mp3' : 'loss.mp3');
            this.renderRound();
            this.showResult(won ? 'YOU WIN' : 'YOU LOSE', won ? 'Winning line confirmed / new game loading' : 'Your friend owns the line / new game loading', won ? '' : 'loss-state');
            this.scheduleOnlineReset();
            return true;
        }
        if (this.blocks.every(Boolean)) {
            this.stopTimer();
            this.ended = true;
            this.setStatus("It's a draw.");
            this.scores.draw += 1;
            this.playSound('tie.m4a');
            this.renderRound();
            this.showResult('DRAW GAME', 'No winning line / new game loading', 'draw-state');
            this.scheduleOnlineReset();
            return true;
        }
        return false;
    }

    newGame() {
        if (this.role !== 'host' || !this.connection?.open) return this.setStatus('Only the host can start a new game.');
        window.clearTimeout(this.autoResetTimer);
        this.resetBoard();
        this.ended = false;
        this.round += 1;
        this.connection.send({ type: 'reset', round: this.round, scores: this.scores });
        this.hideResult();
        this.renderRound();
        this.startTimer();
        this.setStatus('New game started. Your turn.');
    }

    resetBoard() {
        this.blocks.fill('');
        this.turn = 'x';
        this.ended = false;
        this.cells.forEach(cell => { cell.textContent = ''; cell.classList.remove('x', 'o', 'cell-placed', 'winner'); });
    }

    showResult(title, detail, stateClass) {
        this.fullResultTitle.textContent = title;
        this.fullResultDetail.textContent = detail;
        this.fullResultScreen.className = `full-result-screen is-visible ${stateClass}`;
        this.fullResultScreen.setAttribute('aria-hidden', 'false');
    }

    hideResult() {
        this.fullResultScreen.className = 'full-result-screen';
        this.fullResultScreen.setAttribute('aria-hidden', 'true');
    }

    scheduleOnlineReset() {
        if (this.role !== 'host') return;
        this.autoResetTimer = window.setTimeout(() => {
            if (!this.connection?.open) return;
            this.resetBoard();
            this.round += 1;
            this.connection.send({ type: 'reset', round: this.round, scores: this.scores });
            this.hideResult();
            this.renderRound();
            this.setStatus('New round started. Your turn.');
        }, 2800);
    }

    startTimer() {
        this.stopTimer();
        this.timeLeft = 30;
        this.renderTimer();
        this.timer = window.setInterval(() => {
            this.timeLeft -= 1;
            this.renderTimer();
            if (this.timeLeft <= 0) this.timeout();
        }, 1000);
    }

    stopTimer() { window.clearInterval(this.timer); this.timer = null; }
    renderTimer() { const timer = document.getElementById('turn-timer'); timer.textContent = this.timeLeft; timer.classList.toggle('warning', this.timeLeft <= 5); }
    timeout() {
        if (this.ended || !this.connection?.open) return;
        this.stopTimer();
        this.ended = true;
        const winner = this.turn === 'x' ? 'o' : 'x';
        const won = winner === this.roleMark();
        this.scores[winner] += 1;
        this.playSound(won ? 'confetty.mp3' : 'loss.mp3');
        this.renderRound();
        this.setStatus(won ? 'You win on time!' : 'You lose on time.');
        this.showResult(won ? 'YOU WIN' : 'YOU LOSE', won ? 'Opponent ran out of time / new game loading' : 'Your time expired / new game loading', won ? '' : 'loss-state');
        if (this.role === 'host') {
            this.connection.send({ type: 'timeout', winner, scores: this.scores });
            this.scheduleOnlineReset();
        }
    }

    playSound(file) { if (this.soundOn) new Audio(`./assests/tune/${file}`).play().catch(() => {}); }
    renderRound() {
        const round = String(this.round).padStart(2, '0');
        document.getElementById('round-number').textContent = round;
        document.getElementById('round-label').textContent = round;
        document.getElementById('online-score-x').textContent = this.scores.x;
        document.getElementById('online-score-o').textContent = this.scores.o;
        document.getElementById('online-score-draw').textContent = this.scores.draw;
    }

    roleMark() { return this.role === 'host' ? 'x' : 'o'; }
    winningLine() { return [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].find(([a,b,c]) => this.blocks[a] && this.blocks[a] === this.blocks[b] && this.blocks[a] === this.blocks[c]); }
    isOver() { return Boolean(this.winningLine()) || this.blocks.every(Boolean); }
    renderBoard() { this.blocks.forEach((mark, index) => { this.cells[index].textContent = mark; this.cells[index].classList.toggle('x', mark === 'x'); this.cells[index].classList.toggle('o', mark === 'o'); }); }
    setStatus(message) { this.status.textContent = message; }
}
