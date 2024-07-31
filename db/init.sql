CREATE TABLE IF NOT EXISTS query_results (
    id SERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);