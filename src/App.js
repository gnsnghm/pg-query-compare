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

  const renderResults = (result, index) => {
    if (result.error) {
      return (
        <div className="result-container" key={index}>
          <h3>Database {index + 1}</h3>
          <div className="alert alert-danger">{result.error}</div>
        </div>
      );
    }

    return (
      <div className="result-container" key={index}>
        <h3>Database {index + 1}</h3>
        <div className="result-box">
          <h4>EXPLAIN ANALYZE</h4>
          <div className="explain-box">
            {result.explain &&
              result.explain.map((item, i) => (
                <div key={i} className="mb-3">
                  {renderQueryPlan(item["QUERY PLAN"])}
                </div>
              ))}
          </div>
          <h4>Query Result (First 5 rows)</h4>
          <div className="query-box">
            <pre>{result.query && JSON.stringify(result.query, null, 2)}</pre>
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
