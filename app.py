import os
from flask import Flask, render_template
from flask_socketio import SocketIO
from events.socket_handler import register_socket_events

# --- 設定・定数 ---
THEME_FILE_PATH = 'themes.txt'
DEFAULT_THEMES = ["お題ファイルが見つかりません"]

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'

# CORS許可
socketio = SocketIO(app, cors_allowed_origins="*")

# イベント登録
register_socket_events(socketio)

# --- ヘルパー関数 ---
def load_themes(path):
    """お題ファイルを読み込んでリストを返す。失敗時はデフォルト値を返す。"""
    if not os.path.exists(path):
        return DEFAULT_THEMES

    try:
        with open(path, 'r', encoding='utf-8') as f:
            # 空行を除去してリスト化
            return [line.strip() for line in f if line.strip()]
    except Exception as e:
        print(f"Error reading themes: {e}")
        return ["お題の読み込みエラーが発生しました"]

# --- ルーティング ---
@app.route('/')
def index():
    return render_template('index.html', themes=load_themes(THEME_FILE_PATH))

# --- メイン実行 ---
if __name__ == '__main__':
    print("Starting server on port 5001...")
    socketio.run(app, host='0.0.0.0', port=5001, debug=True)