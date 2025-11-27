from typing import List, Dict, Optional
from .utils import normalize_text

# 定数: ボードの枚数
BOARD_SIZE = 7
PADDING_CHAR = '×'

class Player:
    def __init__(self, uid: str, name: str, word: str):
        self.uid = uid
        self.name = name
        self.word = word
        
        norm = normalize_text(word)
        if len(norm) > BOARD_SIZE:
            norm = norm[:BOARD_SIZE]
        self.normalized_word = norm.ljust(BOARD_SIZE, PADDING_CHAR)
        
        self.opened_indices: List[int] = []
        self.is_alive: bool = True
        self.valid_char_count = sum(1 for c in self.normalized_word if c != PADDING_CHAR)

    def check_hit(self, char: str) -> bool:
        if not self.is_alive: return False
        if char == PADDING_CHAR: return False

        hit = False
        for index, wc in enumerate(self.normalized_word):
            if wc == char:
                if index not in self.opened_indices:
                    self.opened_indices.append(index)
                    hit = True
        
        if hit:
            self.opened_indices.sort()
            opened_valid_count = sum(1 for i in self.opened_indices if self.normalized_word[i] != PADDING_CHAR)
            if opened_valid_count == self.valid_char_count:
                self.is_alive = False
                
        return hit

class Game:
    def __init__(self):
        self.reset() # 初期化処理を共通化

    def reset(self):
        """ゲームの状態を完全にリセットする"""
        self.players: Dict[str, Player] = {}
        self.turn_order: List[str] = []
        self.current_turn_index: int = 0
        self.attack_streak: int = 0
        self.game_started: bool = False
        self.game_over: bool = False
        self.winner: Optional[str] = None
        self.used_chars: List[str] = []

    def add_player(self, uid: str, name: str, word: str):
        # ゲーム開始後は参加不可
        if self.game_started:
            return False
        
        self.players[uid] = Player(uid, name, word)
        if uid not in self.turn_order:
            self.turn_order.append(uid)
        return True

    def start_game(self) -> bool:
        """
        手動で呼び出される。2人以上いれば開始する。
        """
        if len(self.players) < 2:
            return False
        
        if not self.game_started:
            self.game_started = True
            self.game_over = False
            self.winner = None
            return True
        return False

    def get_current_player_uid(self) -> Optional[str]:
        if not self.turn_order:
            return None
        return self.turn_order[self.current_turn_index]

    def next_turn(self):
        self.attack_streak = 0
        original_index = self.current_turn_index
        
        while True:
            self.current_turn_index = (self.current_turn_index + 1) % len(self.turn_order)
            next_uid = self.turn_order[self.current_turn_index]
            if self.players[next_uid].is_alive:
                break
            if self.current_turn_index == original_index:
                break

    def attack(self, attacker_uid: str, char: str) -> dict:
        if not self.game_started:
            return {"status": "error", "message": "Game has not started yet"}
        if self.game_over:
            return {"status": "error", "message": "Game is over"}
        
        if attacker_uid != self.get_current_player_uid():
            return {"status": "error", "message": "Not your turn"}

        norm_char = normalize_text(char)
        if not norm_char or len(norm_char) != 1:
             return {"status": "error", "message": "Invalid char"}
        
        if norm_char in self.used_chars:
             pass
        else:
            self.used_chars.append(norm_char)

        hit_someone = False
        
        for uid, p in self.players.items():
            if p.check_hit(norm_char):
                hit_someone = True

        alive_players = [p for p in self.players.values() if p.is_alive]
        if len(self.players) > 1 and len(alive_players) <= 1:
            self.game_over = True
            self.winner = alive_players[0].name if alive_players else "Draw"
            return {"status": "success", "hit": hit_someone, "game_over": True}

        if hit_someone:
            if self.attack_streak < 1:
                self.attack_streak += 1
            else:
                self.next_turn()
        else:
            self.next_turn()

        return {"status": "success", "hit": hit_someone, "game_over": False}

    def get_masked_state_for(self, viewer_uid: str) -> dict:
        players_data = []
        for uid, p in self.players.items():
            if uid == viewer_uid:
                display_word = list(p.normalized_word)
            else:
                display_word = []
                chars = list(p.normalized_word)
                for i, c in enumerate(chars):
                    if i in p.opened_indices or not p.is_alive:
                        display_word.append(c)
                    else:
                        display_word.append("*")
            
            players_data.append({
                "uid": uid,
                "name": p.name,
                "display_word": display_word,
                "is_alive": p.is_alive,
                "is_turn": (uid == self.get_current_player_uid()) if self.game_started else False
            })
            
        return {
            "players": players_data,
            "turn_player_uid": self.get_current_player_uid() if self.game_started else None,
            "used_chars": self.used_chars,
            "game_started": self.game_started,
            "game_over": self.game_over,
            "winner": self.winner
        }