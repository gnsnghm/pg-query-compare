from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor, Json
import os

app = Flask(__name__)
CORS(app)

# 記録用DBの設定
record_db_config = {
    'dbname': 'compare_log',
    'user': 'postgres',
    'password': 'postgres00',
    'host': 'localhost',
    'port': 5433
}

# PostgreSQLの設定（複数のインスタンスを管理するための例）
db_configs = [
    {
        'dbname': 'compare_1',
        'user': 'postgres',
        'password': 'postgres00',
        'host': 'localhost',
        'port': 5433
    },
    {
        'dbname': 'compare_2',
        'user': 'postgres',
        'password': 'postgres00',
        'host': 'localhost',
        'port': 5434
    }
]


def execute_query(db_config, query, explain=False):
    try:
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        if explain:
            cursor.execute(f"EXPLAIN ANALYZE {query}")
        else:
            cursor.execute(f"{query} LIMIT 5")
        result = cursor.fetchall()
        cursor.close()
        conn.close()
        return result
    except Exception as e:
        return {'error': str(e)}


@app.route('/execute', methods=['POST'])
def execute():
    data = request.json
    query = data.get('query')
    results = []

    for db_config in db_configs:
        explain_result = execute_query(db_config, query, explain=True)
        query_result = execute_query(db_config, query, explain=False)
        results.append({
            'db_info': f"{db_config['host']}:{db_config['port']}/{db_config['dbname']}",
            'explain': explain_result,
            'query': query_result
        })

    record_results(query, results)

    return jsonify(results)


def record_results(query, results):
    try:
        conn = psycopg2.connect(**record_db_config)
        cursor = conn.cursor()
        for result in results:
            cursor.execute(
                "INSERT INTO query_results (query, result) VALUES (%s, %s)",
                # RealDictRow オブジェクトを JSON に変換
                (query, Json(result))
            )
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error recording results: {e}")


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
