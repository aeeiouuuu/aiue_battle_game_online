# あいうえバトル Online

Flask と Socket.IO を使用した、リアルタイム対戦型単語推測ゲームです。
各自が設定した単語を隠し持ち、相手の単語に含まれる文字を当てて全滅させることを目指します。

## 特徴

  * **リアルタイム対戦**: 複数のプレイヤーで同時に接続し、ターン制で進行します。
  * **単語設定**: ひらがな・カタカナに対応（自動で正規化されます）。
  * **攻撃システム**: 50音表から文字を選んで攻撃。ヒットするとその文字が開示されます。
  * **お題機能**: 単語が思いつかないときのために、ランダムなお題ヒントを表示します。

## 必要要件

  * Python 3.8 以上
  * 推奨ブラウザ: Chrome, Safari, Edge, Firefox

## インストールと起動

1.  **リポジトリのクローン**

    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```

2.  **依存ライブラリのインストール**

    ```bash
    pip install flask flask-socketio
    ```

3.  **サーバーの起動**

    ```bash
    python app.py
    ```

4.  **ゲームへのアクセス**
    ngrok http 5001

## 遊び方

1.  **参加**: ニックネームと「自分の単語（7文字以内）」を入力して参加します。
2.  **待機**: 参加者が揃うのを待ちます（最低2人必要）。
3.  **開始**: 「ゲーム開始」ボタンを押すとゲームが始まります。
4.  **攻撃**: 自分のターンになったら、画面下の50音表から文字を1つ選びます。
      * 誰かの単語に含まれていれば**HIT**（文字が開示され、もう一度攻撃可能 ※設定による）。
      * 含まれていなければ次の人のターンへ。
5.  **勝敗**: 自分の単語の文字がすべてめくられると脱落。最後まで生き残ったプレイヤーの勝利です。

## ディレクトリ構成

```
.gitignore
app.py
events/socket_handler.py
game_logic/__init__.py
game_logic/core.py
game_logic/utils.py
static/css/style.css
static/images/bg.jpg
static/images/header-bg.jpg
static/js/main.js
templates/index.html
themes.txt
```
