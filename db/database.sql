CREATE TABLE game_state (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    subchapter TEXT NOT NULL,
    current_conversation_id BIGINT NOT NULL
);
