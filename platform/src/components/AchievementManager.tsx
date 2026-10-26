"use client";
import { useState } from "react";
import { apiResponseError, userErrorMessage } from "@/lib/user-errors";
import type { User } from "firebase/auth";
import type { Achievement } from "@/lib/achievements";
export function AchievementManager({ user }: { user: User }) {
  const [records, setRecords] = useState<Achievement[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  async function request(method: "GET" | "PATCH") {
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/achievements", {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(method === "PATCH"
          ? { body: JSON.stringify({ featuredIds: selected }) }
          : {}),
      });
      const result = await response.json();
      if (!response.ok)
        throw apiResponseError(response.status, result);
      if (method === "GET") {
        setRecords(result.achievements);
        setLoaded(true);
      }
      setSelected(result.featuredIds);
      setStatus(
        method === "GET" ? "Selection loaded." : "Experience selection saved.",
      );
    } catch (error) {
      setStatus(userErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="achievement-manager">
      <h2>Experience highlights</h2>
      <p>
        Choose up to six achievements for Experience. The full verified
        collection stays on Achievements.
      </p>
      <button disabled={busy} onClick={() => request("GET")}>
        Load achievement selection
      </button>
      {loaded && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            request("PATCH");
          }}
        >
          <fieldset disabled={busy}>
            <legend>Show on Experience · {selected.length} / 6</legend>
            {records.map((record) => (
              <label className="achievement-choice" key={record.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(record.id)}
                  disabled={
                    !selected.includes(record.id) && selected.length >= 6
                  }
                  onChange={(e) =>
                    setSelected((ids) =>
                      e.target.checked
                        ? [...ids, record.id]
                        : ids.filter((id) => id !== record.id),
                    )
                  }
                />
                <span>
                  {record.title}
                  <small>{record.issuer}</small>
                </span>
              </label>
            ))}
          </fieldset>
          <button disabled={busy} type="submit">
            Save Experience selection
          </button>
        </form>
      )}
      <p className="status" role="status">
        {status}
      </p>
    </section>
  );
}
