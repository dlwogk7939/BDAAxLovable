import React, { useEffect, useState } from "react";
import "./App.css";

const API_BASE = "http://localhost:8000";

type BacData = {
  bac: number;
  rest_minutes: number;
  // You can add more fields from your backend here if needed
};

type AiDrink = {
  ai_drink_type: string;
  ai_volume_ml: number;
  ai_abv_percent: number;
  ai_confidence: number;
};

export default function App() {
  // ===== Global session =====
  const [sessionId, setSessionId] = useState<string | null>(null);

  // ===== Returned from backend =====
  const [bacData, setBacData] = useState<BacData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // ===== Manual drink input =====
  const [volumeMl, setVolumeMl] = useState<number>(350);
  const [abvPercent, setAbvPercent] = useState<number>(5);

  // ===== Hydration input =====
  const [waterMl, setWaterMl] = useState<number>(200);

  // ===== Snacks input =====
  const [snackType, setSnackType] = useState<string>("light");
  const [snackModifier, setSnackModifier] = useState<number>(0.95);

  // ===== AI Image result (pending, not yet committed) =====
  const [pendingAiDrink, setPendingAiDrink] = useState<AiDrink | null>(null);

  // ==========================================================
  // 1. CREATE SESSION AUTOMATICALLY ON LOAD
  // ==========================================================
  useEffect(() => {
    async function startSession() {
      const res = await fetch(`${API_BASE}/api/session/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: "demo-user" }),
      });

      const data = await res.json();
      setSessionId(data.session_id);
    }

    startSession();
  }, []);

  // ==========================================================
  // Helper: fetch full session status (BAC, etc.) if needed
  // ==========================================================
  async function refreshSession() {
    if (!sessionId) return;

    const res = await fetch(
      `${API_BASE}/api/session/status?session_id=${sessionId}`
    );
    const data = await res.json();
    setBacData(data);
  }

  // ==========================================================
  // 2. LOG A DRINK (manual inputs)
  // ==========================================================
  async function handleAddDrink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sessionId) return;

    setLoading(true);

    const res = await fetch(`${API_BASE}/api/drinks/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        volume_ml: Number(volumeMl),
        abv_percent: Number(abvPercent),
      }),
    });

    const data = await res.json();
    setBacData(data);
    setLoading(false);
  }

  // ==========================================================
  // 3. UPLOAD IMAGE → GPT ANALYSIS (NO DB WRITE)
  // ==========================================================
  async function handleImageUpload(
    evt: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = evt.target.files?.[0];
    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file); // backend now only expects file

    const res = await fetch(`${API_BASE}/api/analyze-cocktail`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    // data should be: { ai_drink_type, ai_volume_ml, ai_abv_percent, ai_confidence }

    setPendingAiDrink(data);
    setLoading(false);
  }

  // ==========================================================
  // 4. COMMIT AI DRINK → CALL /api/drinks/add → UPDATE BAC
  // ==========================================================
  async function handleAddAiDrinkToSession() {
    if (!sessionId || !pendingAiDrink) return;

    setLoading(true);

    const res = await fetch(`${API_BASE}/api/drinks/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        volume_ml: Number(pendingAiDrink.ai_volume_ml),
        abv_percent: Number(pendingAiDrink.ai_abv_percent),
      }),
    });

    const data = await res.json();
    setBacData(data);          // BAC updated by backend
    setPendingAiDrink(null);   // clear the pending AI box
    setLoading(false);
  }

  // ==========================================================
  // 5. LOG HYDRATION
  // ==========================================================
  async function handleAddWater(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sessionId) return;

    setLoading(true);

    const res = await fetch(`${API_BASE}/api/hydration/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        volume_ml: Number(waterMl),
      }),
    });

    const data = await res.json();
    setBacData(data);
    setLoading(false);
  }

  // ==========================================================
  // 6. LOG SNACK
  // ==========================================================
  async function handleAddSnack(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sessionId) return;

    setLoading(true);

    const res = await fetch(`${API_BASE}/api/snacks/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        snack_type: snackType,
        modifier: Number(snackModifier),
      }),
    });

    const data = await res.json();
    setBacData(data);
    setLoading(false);
  }

  // ==========================================================
  // 7. UI RENDERING
  // ==========================================================
  return (
    <div className="app-shell">
      <header className="hero">
        <h1>Drinkable BAC Dashboard</h1>
        <p className="subtitle">
          Add image → AI guesses drink → confirm → BAC updates.
        </p>
      </header>

      {!sessionId && <p>Starting session...</p>}

      {bacData && (
        <section className="status-card">
          <h2>Current BAC</h2>
          <div className="bac-value">
            {bacData?.bac !== undefined ? bacData.bac.toFixed(3) : "0.000"}
          </div>
          <p className="status-text">
            Estimated rest time: {bacData.rest_minutes ?? 0} minutes
          </p>
        </section>
      )}

      {/* ====================== */}
      {/* Add drink manually      */}
      {/* ====================== */}
      <section className="panel">
        <h2>Add Drink (Manual)</h2>

        <form onSubmit={handleAddDrink} className="input-grid">
          <label>
            Volume (ml)
            <input
              type="number"
              value={volumeMl}
              onChange={(e) => setVolumeMl(Number(e.target.value))}
            />
          </label>

          <label>
            ABV %
            <input
              type="number"
              value={abvPercent}
              onChange={(e) => setAbvPercent(Number(e.target.value))}
            />
          </label>

          <button className="primary" type="submit">
            Log Drink
          </button>
        </form>
      </section>

      {/* ====================== */}
      {/* Add drink via AI image */}
      {/* ====================== */}
      <section className="panel">
        <h2>Add Drink via Cocktail Image</h2>

        <input type="file" accept="image/*" onChange={handleImageUpload} />

        {pendingAiDrink && (
          <div className="ai-box">
            <h3>AI Detected Drink</h3>
            <p>Type: {pendingAiDrink.ai_drink_type}</p>
            <p>Volume: {pendingAiDrink.ai_volume_ml} ml</p>
            <p>ABV: {pendingAiDrink.ai_abv_percent}%</p>
            <p>
              Confidence:{" "}
              {(pendingAiDrink.ai_confidence * 100).toFixed(0)}%
            </p>

            <button
              className="primary"
              type="button"
              onClick={handleAddAiDrinkToSession}
            >
              Add This Drink
            </button>
          </div>
        )}
      </section>

      {/* ====================== */}
      {/* Hydration              */}
      {/* ====================== */}
      <section className="panel">
        <h2>Hydration</h2>

        <form onSubmit={handleAddWater} className="input-grid">
          <label>
            Water (ml)
            <input
              type="number"
              value={waterMl}
              onChange={(e) => setWaterMl(Number(e.target.value))}
            />
          </label>

          <button className="primary" type="submit">
            Log Water
          </button>
        </form>
      </section>

      {/* ====================== */}
      {/* Snack logging          */}
      {/* ====================== */}
      <section className="panel">
        <h2>Snacks</h2>

        <form onSubmit={handleAddSnack} className="input-grid">
          <label>
            Snack Type
            <select
              value={snackType}
              onChange={(e) => setSnackType(e.target.value)}
            >
              <option value="light">Light snack</option>
              <option value="carb">Carb heavy</option>
              <option value="meal">Meal</option>
            </select>
          </label>

          <label>
            Modifier
            <input
              type="number"
              step="0.01"
              value={snackModifier}
              onChange={(e) =>
                setSnackModifier(Number(e.target.value))
              }
            />
          </label>

          <button className="primary" type="submit">
            Log Snack
          </button>
        </form>
      </section>

      {loading && <p>Processing...</p>}
    </div>
  );
}
