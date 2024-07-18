from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor, Json
import re
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
        'port': 5433
    }
]


def remove_comments(query):
    # シングルラインコメントを削除
    query = re.sub(r'--.*?(\r\n|\r|\n)', ' ', query)
    # マルチラインコメントを削除
    query = re.sub(r'/\*.*?\*/', ' ', query, flags=re.DOTALL)
    return query


def is_select_query(query):
    query = remove_comments(query).strip().upper()
    return query.startswith("SELECT") or query.startswith("WITH")


def execute_query(db_config, query, explain=False, use_buffers=False):
    try:
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        result = None
        if explain:
            explain_query = "EXPLAIN (ANALYZE"
            if use_buffers:
                explain_query += ", BUFFERS"
            explain_query += ")"
            cursor.execute(f"{explain_query} {query}")
            result = cursor.fetchall()
        else:
            cursor.execute("BEGIN")
            try:
                cursor.execute(query)
                if is_select_query(query):
                    result = cursor.fetchall()
                else:
                    result = [{"error": "Non-SELECT queries are not allowed."}]
            except Exception as e:
                result = [{"error": str(e)}]
            finally:
                cursor.execute("ROLLBACK")
        cursor.close()
        conn.close()
        return result
    except Exception as e:
        return [{'error': str(e)}]


@app.route('/execute', methods=['POST'])
def execute():
    data = request.json
    query = data.get('query')
    use_buffers = data.get('useBuffers', False)
    results = []

    for db_config in db_configs:
        explain_result = execute_query(
            db_config, query, explain=True, use_buffers=use_buffers)
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
