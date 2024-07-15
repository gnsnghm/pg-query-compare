import React, { useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:5000/execute", {
        query,
      });
      setResults(response.data);
      setError(null);
    } catch (err) {
      setError(err.response.data.error);
    }
  };

  const renderQueryPlan = (plan) => {
    if (!plan) return null;
    const lines = plan.split("\n");
    return lines.map((line, index) => {
      const indentLevel = line.match(/^ */)[0].length / 2; // 2 spaces per indent level
      return (
        <div key={index} style={{ paddingLeft: `${indentLevel * 20}px` }}>
          {line}
        </div>
      );
    });
  };

  const handleDownload = (content, filename) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderResults = (result, index) => {
    const explainText =
      result.explain && Array.isArray(result.explain)
        ? result.explain.map((item) => item["QUERY PLAN"]).join("\n")
        : "Error in EXPLAIN ANALYZE";

    return (
      <div className="result-container" key={index}>
        <h3>Database {index + 1}</h3>
        <p>{result.db_info}</p>
        <div className="result-box">
          <h4>EXPLAIN ANALYZE</h4>
          <div className="explain-box">
            {result.explain && Array.isArray(result.explain) ? (
              <>
                {result.explain.map((item, i) => (
                  <div key={i} className="mb-3">
                    {renderQueryPlan(item["QUERY PLAN"])}
                  </div>
                ))}
                <button
                  className="btn btn-secondary mt-3"
                  onClick={() =>
                    handleDownload(
                      explainText,
                      `explain_result_db${index + 1}.txt`
                    )
                  }
                >
                  Download EXPLAIN Result
                </button>
              </>
            ) : (
              <div className="alert alert-danger">
                {result.explain ? result.explain.error : "Unknown error"}
              </div>
            )}
          </div>
          <h4>Query Result (First 5 rows)</h4>
          <div className="query-box">
            {result.query && Array.isArray(result.query) ? (
              <pre>{JSON.stringify(result.query, null, 2)}</pre>
            ) : (
              <div className="alert alert-danger">
                {result.query ? result.query.error : "Unknown error"}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container">
      <h1 className="mt-5">PostgreSQL Query Comparison Tool</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="query">SQL Query</label>
          <textarea
            className="form-control"
            id="query"
            rows="3"
            value={query}
            onChange={handleQueryChange}
          ></textarea>
        </div>
        <button type="submit" className="btn btn-primary mt-3">
          Execute
        </button>
      </form>
      {error && <div className="alert alert-danger mt-3">{error}</div>}
      <div className="results-container mt-5">
        {results.map((result, index) => renderResults(result, index))}
      </div>
    </div>
  );
}

export default App;
