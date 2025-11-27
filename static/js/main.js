const socket = io();

// 50音表（ひらがな + ー）
const HIRAGANA = [
    "あ","い","う","え","お",
    "か","き","く","け","こ",
    "さ","し","す","せ","そ",
    "た","ち","つ","て","と",
    "な","に","ぬ","ね","の",
    "は","ひ","ふ","へ","ほ",
    "ま","み","む","め","も",
    "や","ゆ","よ",
    "ら","り","る","れ","ろ",
    "わ","を","ん","ー"
];

let myUid = null;
let currentGameState = null;

socket.on('connect', () => {
    console.log("Connected. ID:", socket.id);
    myUid = socket.id;
});

socket.on('error', (data) => {
    alert("エラー: " + data.message);
});

socket.on('log', (data) => {
    console.log("Log:", data.message);
});

socket.on('update_state', (state) => {
    currentGameState = state;
    renderGame(state);
});

// --- 追加: リセット通知を受け取った時の処理 ---
socket.on('game_reset', () => {
    alert("ゲームがリセットされました。ロビーに戻ります。");
    
    // 画面遷移: ゲーム画面 -> ログイン画面
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    
    // リセットボタンエリアを隠す
    document.getElementById('reset-controls').classList.add('hidden');
    
    // 入力フォームは前回の値を残したままにするので、そのまま「参加する」を押せばすぐ再戦も可能
});

// 参加ボタン
document.getElementById('btn-join').addEventListener('click', () => {
    const name = document.getElementById('input-name').value;
    const word = document.getElementById('input-word').value;

    if (!name || !word) {
        alert("名前と単語を入力してください");
        return;
    }
    if (word.length > 7) {
         alert("単語は7文字以内で入力してください");
         return;
    }
    const kanaRegex = /^[ぁ-んァ-ヶー]+$/;
    if (!kanaRegex.test(word)) {
        alert("単語には「ひらがな」または「カタカナ」のみ使用できます。\n（漢字、英数字、記号は使えません）");
        return;
    }

    socket.emit('join_game', { name: name, word: word });

    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
});

// ゲーム開始ボタン
document.getElementById('btn-start-game').addEventListener('click', () => {
    socket.emit('request_start_game');
});

// --- 追加: リセットボタン ---
document.getElementById('btn-reset-game').addEventListener('click', () => {
    if(confirm("全員の画面をロビーに戻します。よろしいですか？")) {
        socket.emit('request_reset_game');
    }
});

function renderGame(state) {
    const { players, turn_player_uid, used_chars, game_over, winner, game_started } = state;
    const isMyTurn = (turn_player_uid === myUid) && !game_over && game_started;

    // --- 1. ステータスバーとロビー表示の制御 ---
    const statusEl = document.getElementById('game-status');
    const lobbyEl = document.getElementById('lobby-controls');
    const startBtn = document.getElementById('btn-start-game');
    const resetEl = document.getElementById('reset-controls'); // リセットボタンエリア

    if (!game_started) {
        // ゲーム開始前（ロビー画面）
        statusEl.innerText = "参加者を待っています...";
        statusEl.style.backgroundColor = "#6c757d"; 
        
        lobbyEl.classList.remove('hidden');
        resetEl.classList.add('hidden'); // 開始前はリセットボタン不要
        
        // 2人以上なら開始ボタン有効化
        if (players.length >= 2) {
            startBtn.disabled = false;
            startBtn.innerText = `ゲーム開始 (${players.length}人)`;
        } else {
            startBtn.disabled = true;
            startBtn.innerText = "待機中... (最低2人必要)";
        }

    } else {
        // ゲーム進行中
        lobbyEl.classList.add('hidden'); 

        if (game_over) {
            statusEl.innerText = `ゲーム終了！ 勝者: ${winner || 'なし'}`;
            statusEl.style.backgroundColor = "#dc3545"; 
            
            // --- 追加: ゲーム終了時にリセットボタンを表示 ---
            resetEl.classList.remove('hidden');
            
        } else if (isMyTurn) {
            statusEl.innerText = "あなたのターンです！文字を選んで攻撃してください";
            statusEl.style.backgroundColor = "#28a745"; 
            resetEl.classList.add('hidden');
        } else {
            const turnPlayer = players.find(p => p.uid === turn_player_uid);
            const turnName = turnPlayer ? turnPlayer.name : "???";
            statusEl.innerText = `${turnName} さんのターン`;
            statusEl.style.backgroundColor = "#333";
            resetEl.classList.add('hidden');
        }
    }

    // --- 2. プレイヤーリスト描画 ---
    const playersListEl = document.getElementById('players-list');
    playersListEl.innerHTML = "";

    players.forEach(p => {
        const div = document.createElement('div');
        div.className = `player-card`;
        
        if (p.uid === myUid) div.classList.add('is-me');
        if (p.is_turn) div.classList.add('is-turn');
        if (!p.is_alive) div.classList.add('is-dead');

        const nameDiv = document.createElement('div');
        nameDiv.className = 'name-label';
        nameDiv.innerHTML = `<strong>${p.name}</strong> ${!p.is_alive ? '(脱落)' : ''}`;
        div.appendChild(nameDiv);

        const boardContainer = document.createElement('div');
        boardContainer.className = 'word-board-container';

        p.display_word.forEach(char => {
            const charBox = document.createElement('div');
            charBox.className = 'char-box';

            if (char === '*') {
                charBox.classList.add('hidden-char');
                charBox.innerText = '?';
            } else {
                charBox.innerText = char;
                if (char === '×') {
                    charBox.classList.add('empty-slot');
                }
            }
            boardContainer.appendChild(charBox);
        });

        div.appendChild(boardContainer);
        playersListEl.appendChild(div);
    });

    // --- 3. 50音ボード描画 ---
    renderBoard(used_chars, isMyTurn, game_started);
}

function renderBoard(usedChars, isMyTurn, gameStarted) {
    const boardEl = document.getElementById('board-grid');
    boardEl.innerHTML = "";

    if (isMyTurn) {
        boardEl.classList.add('active-turn');
    } else {
        boardEl.classList.remove('active-turn');
    }

    HIRAGANA.forEach(char => {
        const btn = document.createElement('button');
        btn.innerText = char;
        btn.className = 'char-btn';

        if (usedChars.includes(char)) {
            btn.disabled = true;
        }

        if (!isMyTurn || !gameStarted) {
            btn.disabled = true;
        }

        btn.onclick = () => {
            if (isMyTurn && gameStarted && !btn.disabled) {
                socket.emit('attack', { char: char });
            }
        };

        boardEl.appendChild(btn);
    });
}