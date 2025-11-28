const socket = io();
const $ = id => document.getElementById(id); // 短縮用ヘルパー
const el = (tag, cls = '', txt = '') => {    // 要素作成ヘルパー
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    if(txt) e.innerText = txt;
    return e;
};

// --- 設定・状態 ---
const IMAGES = ["bg.jpg", "bg2.jpg", "bg3.jpg"];
const HIRAGANA = [...'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんー'];
let myUid, currentBg = 0, prevOpen = {}; 

// --- Socket受信 ---
socket.on('connect', () => (myUid = socket.id) && console.log("ID:", myUid));
socket.on('error', d => alert("エラー: " + d.message));
socket.on('log', d => console.log("Log:", d.message));
socket.on('update_state', renderGame);
socket.on('new_chat', addChatMessage);

socket.on('game_reset', () => {
    alert("リセットされました。");
    prevOpen = {};
    toggleScreens(false); // ロビーへ
});

// --- UI操作イベント ---
$('btn-change-bg').onclick = () => {
    currentBg = (currentBg + 1) % IMAGES.length;
    document.body.style.backgroundImage = `url('/static/images/${IMAGES[currentBg]}')`;
};

$('btn-join').onclick = () => {
    const [name, word] = [$('input-name').value, $('input-word').value];
    if (!name || !word) return alert("入力してください");
    if (word.length > 7 || !/^[ぁ-んァ-ヶー]+$/.test(word)) return alert("7文字以内・かなのみです");

    prevOpen = {};
    socket.emit('join_game', { name, word });
    toggleScreens(true); // ゲーム画面へ
};

$('btn-start-game').onclick = () => socket.emit('request_start_game');
$('btn-reset-game').onclick = () => confirm("リセットしますか？") && socket.emit('request_reset_game');

// チャット送信
const sendChat = (type, msg) => {
    if(!msg) return;
    socket.emit('send_chat', { message: msg, type });
    if(type === 'text') $('chat-input').value = '';
};

$('btn-send-chat').onclick = () => sendChat('text', $('chat-input').value.trim());

$('chat-input').onkeydown = e => {
    if (e.key === 'Enter' && !e.isComposing) {
        sendChat('text', $('chat-input').value.trim());
    }
};

window.sendStamp = char => sendChat('stamp', char);

// --- 描画ロジック ---
function toggleScreens(isGame) {
    $('login-screen').classList.toggle('hidden', isGame);
    $('game-screen').classList.toggle('hidden', !isGame);
    if (!isGame) $('reset-controls').classList.add('hidden');
}

function renderGame(state) {
    const { players, turn_player_uid, used_chars, game_over, winner, game_started } = state;
    const isMe = uid => uid === myUid;
    const isMyTurn = isMe(turn_player_uid) && !game_over && game_started;
    
    // 1. ステータス表示
    const st = $('game-status'), lb = $('lobby-controls'), rs = $('reset-controls'), btn = $('btn-start-game');
    lb.classList.toggle('hidden', game_started);
    rs.classList.toggle('hidden', !game_over);

    if (!game_started) {
        st.innerText = "待機中..."; st.style.background = "#6c757d";
        btn.disabled = players.length < 2;
        btn.innerText = players.length < 2 ? "待機中..." : `開始 (${players.length}人)`;
    } else if (game_over) {
        st.innerText = `終了! 勝者: ${winner || 'なし'}`; st.style.background = "#dc3545";
    } else {
        const turnName = players.find(p => p.uid === turn_player_uid)?.name || "???";
        st.innerText = isMyTurn ? "あなたの番です" : `${turnName} さんの番`;
        st.style.background = isMyTurn ? "#28a745" : "#333";
    }

    // 2. プレイヤーリスト
    const list = $('players-list'); list.innerHTML = "";
    players.forEach(p => {
        const card = el('div', `player-card ${isMe(p.uid)?'is-me':''} ${p.is_turn?'is-turn':''} ${!p.is_alive?'is-dead':''}`);
        card.appendChild(el('div', 'name-label', `${p.name} ${!p.is_alive ? '(脱落)' : ''}`));

        const board = el('div', 'word-board-container');
        const prev = prevOpen[p.uid] || [];

        p.display_word.forEach((char, i) => {
            const box = el('div', 'char-box', char === '*' ? '?' : char);
            const isOpen = p.opened_indices.includes(i);
            
            if (char === '*') box.classList.add('hidden-char');
            if (char === '×') box.classList.add('empty-slot');
            else if (isOpen) {
                box.classList.add('exposed');
                if (!prev.includes(i)) box.classList.add('just-exposed');
            }
            board.appendChild(box);
        });
        card.appendChild(board);
        list.appendChild(card);
        prevOpen[p.uid] = [...p.opened_indices]; // 履歴更新
    });

    // 3. キーボード
    const kb = $('board-grid'); kb.innerHTML = "";
    kb.classList.toggle('active-turn', isMyTurn);
    
    HIRAGANA.forEach(char => {
        const btn = el('button', 'char-btn', char);
        if (used_chars.includes(char)) btn.disabled = true;
        btn.onclick = () => isMyTurn && game_started && !btn.disabled && socket.emit('attack', { char });
        kb.appendChild(btn);
    });
}

function addChatMessage(d) {
    const box = $('chat-history');
    const msgDiv = el('div', `chat-msg ${d.uid === myUid ? 'msg-mine' : 'msg-other'} ${d.type === 'stamp' ? 'msg-stamp' : ''}`);
    
    if (d.type === 'stamp') {
        msgDiv.innerText = d.message;
    } else {
        msgDiv.append(el('span', 'msg-name', d.name), el('span', '', d.message));
    }
    box.appendChild(msgDiv);
    box.scrollTop = box.scrollHeight;
}