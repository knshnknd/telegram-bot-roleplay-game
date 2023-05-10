CREATE TABLE game_state (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL UNIQUE,
    subchapter TEXT NOT NULL DEFAULT '0START',
    current_conversation_id BIGINT NOT NULL DEFAULT 0,
    is_subchapter_end BOOLEAN NOT NULL DEFAULT 'false',
    flags TEXT,
    points BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE journey (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    history TEXT NOT NULL DEFAULT 'start',
    points BIGINT NOT NULL DEFAULT 0,
    connected_chat_id BIGINT
)
