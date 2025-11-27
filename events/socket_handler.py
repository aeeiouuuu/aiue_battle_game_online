from flask import request
from flask_socketio import emit, join_room
from game_logic.core import Game
from game_logic.utils import normalize_text, is_valid_word_format

game_instance = Game()

def register_socket_events(socketio):
    
    @socketio.on('connect')
    def handle_connect():
        print(f"Client connected: {request.sid}")
        join_room('game_room')
        emit('message', {'data': 'Connected to Game Server'})

    @socketio.on('join_game')
    def handle_join(data):
        uid = request.sid
        name = data.get('name', f"Guest-{uid[:4]}")
        word = data.get('word', '')
        
        if not word:
            emit('error', {'message': 'Word is required'})
            return
        
        if not is_valid_word_format(word):
            emit('error', {'message': '単語はひらがな・カタカナのみ使用可能です'})
            return

        try:
            success = game_instance.add_player(uid, name, word)
            if not success:
                emit('error', {'message': 'Game already started or join failed'})
                return
            
            broadcast_game_state(socketio)
            
        except Exception as e:
            print(f"Error in join_game: {e}")
            emit('error', {'message': str(e)})

    @socketio.on('request_start_game')
    def handle_start_request():
        if game_instance.start_game():
            socketio.emit('log', {'message': 'Game Started!'}, room='game_room')
            broadcast_game_state(socketio)
        else:
            emit('error', {'message': 'Cannot start game (needs 2+ players or already started)'})

    # --- 追加箇所ここから ---
    @socketio.on('request_reset_game')
    def handle_reset_request():
        # ゲームをリセットし、全員に通知する
        game_instance.reset()
        socketio.emit('game_reset', {'message': 'Game has been reset. Returning to lobby.'}, room='game_room')
    # --- 追加箇所ここまで ---

    @socketio.on('attack')
    def handle_attack(data):
        uid = request.sid
        char = data.get('char')
        
        result = game_instance.attack(uid, char)
        
        if result['status'] == 'error':
            emit('error', {'message': result['message']})
        else:
            broadcast_game_state(socketio)
            msg = f"Attack '{char}' by {uid[:4]}: {'HIT' if result.get('hit') else 'MISS'}"
            socketio.emit('log', {'message': msg}, room='game_room')

def broadcast_game_state(socketio):
    for uid in game_instance.players.keys():
        state = game_instance.get_masked_state_for(uid)
        socketio.emit('update_state', state, room=uid)