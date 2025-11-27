from flask import Flask, render_template
from flask_socketio import SocketIO
from events.socket_handler import register_socket_events

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'

# CORS許可: ngrokなどの外部アクセス用
socketio = SocketIO(app, cors_allowed_origins="*")

# イベントハンドラの登録
register_socket_events(socketio)

@app.route('/')
def index():
    # 修正箇所: 文字列ではなくHTMLテンプレートを返すように変更
    return render_template('index.html')

if __name__ == '__main__':
    # ngrok http 5001 で公開することを想定
    print("Starting server on port 5001...")
    socketio.run(app, host='0.0.0.0', port=5001, debug=True)