import { useState } from "react";
import { askPharvoAI } from "../services/ai";

export default function PharmacyChatbot() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();

    if (!text.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await askPharvoAI(text.trim());
      setResult(data);
    } catch (err) {
      setError(err?.message || "AI request failed.");
    } finally {
      setLoading(false);
    }
  }

  const matches =
    result?.inventory_matches?.flatMap(
      (group) =>
        (group.available_medicines || []).map(
          (medicine) => ({
            ...medicine,
            candidate_generic: group.candidate_generic,
          })
        )
    ) || [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={{
          position: "fixed",
          right: 22,
          bottom: 22,
          width: 58,
          height: 58,
          borderRadius: "50%",
          border: 0,
          background: "#2563eb",
          color: "white",
          fontSize: 26,
          cursor: "pointer",
          zIndex: 9999,
          boxShadow: "0 8px 24px rgba(0,0,0,.2)",
        }}
      >
        🤖
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            right: 22,
            bottom: 92,
            width: 380,
            maxWidth: "calc(100vw - 32px)",
            maxHeight: "70vh",
            overflowY: "auto",
            background: "white",
            border: "1px solid #ddd",
            borderRadius: 14,
            padding: 16,
            zIndex: 9999,
            boxShadow: "0 12px 35px rgba(0,0,0,.22)",
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            PHARVO AI Assistant
          </h3>

          <form onSubmit={submit}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter Bangla, Banglish or English symptom..."
              rows={3}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 10,
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8,
                width: "100%",
                padding: 10,
                cursor: "pointer",
              }}
            >
              {loading ? "Checking..." : "Ask PHARVO"}
            </button>
          </form>

          {error && (
            <p style={{ color: "crimson" }}>
              {error}
            </p>
          )}

          {result?.classification_status === "out_of_scope" && (
            <div style={{ marginTop: 14 }}>
              <strong>Unable to classify</strong>
              <p>
                Please enter a clearer customer symptom
                or complaint.
              </p>
              <p>No medicine suggestion generated.</p>
            </div>
          )}

          {result?.classification_status === "classified" && (
            <div style={{ marginTop: 14 }}>
              <p>
                <strong>{result.problem_id}</strong>
                {" — "}
                {result.health_problem}
              </p>

              <p>
                <strong>Candidate generics:</strong>{" "}
                {(result.candidate_generics || []).join(", ")}
              </p>

              <strong>Available stock</strong>

              {matches.length === 0 ? (
                <p>No matching in-stock product found.</p>
              ) : (
                matches.map((item) => (
                  <div
                    key={`${item.candidate_generic}-${item.product_id}`}
                    style={{
                      marginTop: 8,
                      padding: 9,
                      border: "1px solid #eee",
                      borderRadius: 8,
                    }}
                  >
                    <strong>
                      {item.brand_name || item.product_name}
                    </strong>
                    <div>{item.product_name}</div>
                    <div>
                      Stock: {item.current_stock}
                    </div>
                    <div>
                      Expiry: {item.expiry_date || "N/A"}
                    </div>
                  </div>
                ))
              )}

              <p
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: "#666",
                }}
              >
                AI classification is decision support only.
                Pharmacist review is required.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
