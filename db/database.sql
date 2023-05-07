CREATE TABLE game_state (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL UNIQUE,
    subchapter TEXT NOT NULL DEFAULT 'start',
    current_conversation_id BIGINT NOT NULL DEFAULT 0
    flags TEXT
);

CREATE TABLE journey (
    chat_id BIGINT PRIMARY KEY REFERENCES game_state (chat_id) ON DELETE CASCADE,
    history TEXT NOT NULL DEFAULT 'start'
)
