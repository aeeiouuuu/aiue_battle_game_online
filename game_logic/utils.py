import re

def normalize_text(text: str) -> str:
    """
    入力された文字列をゲーム用の形式に正規化する。
    1. ひらがな -> カタカナ (処理の共通化のため一度変換)
    2. 濁点・半濁点を除去 (ガ -> カ)
    3. 小文字 -> 大文字 (ッ -> ツ)
    4. 最後に全て ひらがな に戻す
    5. 長音符(ー)はそのまま
    """
    if not text:
        return ""

    # --- Step 1: 入力を一度カタカナに統一する ---
    # (既存のマッピングロジックを再利用するため)
    kata_text = ""
    for char in text:
        if '\u3041' <= char <= '\u3096': # ひらがな範囲
            kata_text += chr(ord(char) + 0x60)
        else:
            kata_text += char

    # --- Step 2: 濁点除去 & 小文字->大文字 (カタカナベースで処理) ---
    conversion_map = str.maketrans({
        # 濁点・半濁点除去
        'ガ': 'カ', 'ギ': 'キ', 'グ': 'ク', 'ゲ': 'ケ', 'ゴ': 'コ',
        'ザ': 'サ', 'ジ': 'シ', 'ズ': 'ス', 'ゼ': 'セ', 'ゾ': 'ソ',
        'ダ': 'タ', 'ヂ': 'チ', 'ヅ': 'ツ', 'デ': 'テ', 'ド': 'ト',
        'バ': 'ハ', 'ビ': 'ヒ', 'ブ': 'フ', 'ベ': 'ヘ', 'ボ': 'ホ',
        'パ': 'ハ', 'ピ': 'ヒ', 'プ': 'フ', 'ペ': 'ヘ', 'ポ': 'ホ',
        'ヴ': 'ウ',
        # 小文字 -> 大文字
        'ァ': 'ア', 'ィ': 'イ', 'ゥ': 'ウ', 'ェ': 'エ', 'ォ': 'オ',
        'ッ': 'ツ',
        'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ',
        'ヮ': 'ワ',
        'ヵ': 'カ', 'ヶ': 'ケ'
    })

    normalized_kata = kata_text.translate(conversion_map)

    # --- Step 3: カタカナ -> ひらがな に変換して返す ---
    # ゲーム画面の50音表が「ひらがな」であるため、内部データもひらがなに合わせる
    final_text = ""
    for char in normalized_kata:
        if '\u30A1' <= char <= '\u30F6': # カタカナ範囲
            final_text += chr(ord(char) - 0x60)
        else:
            # ー (長音) や × (パディング) はそのまま
            final_text += char

    return final_text

def is_valid_word_format(text: str) -> bool:
    """
    ひらがな・カタカナ・長音符のみで構成されているかチェックする
    """
    if not text:
        return False
    # 正規表現: 行頭から行末までが指定範囲内か
    return bool(re.fullmatch(r'[ぁ-んァ-ヶー]+', text))
# ------------------------

# テスト用
if __name__ == "__main__":
    test_words = ["がっこう", "ぱーてぃー", "じしん", "ちょこ", "サーバー"]
    for w in test_words:
        print(f"{w} -> {normalize_text(w)}")
    # 出力予定:
    # がっこう -> かつこう
    # ぱーてぃー -> はーていー
    # じしん -> ししん
    # ちょこ -> ちよこ
    # サーバー -> さーばー (ではなく さーはー になるはず)