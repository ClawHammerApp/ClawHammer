import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { VerifiedBadge } from "../components/VerifiedBadge";

export function EvaluationsPage() {
  const evaluations = useQuery(api.skillApi.listAllEvaluations, { limit: 50 });
  const navigate = useNavigate();
  const [onlyVerified, setOnlyVerified] = useState(false);

  const filteredEvaluations = (evaluations ?? []).filter((eval_: any) =>
    onlyVerified ? Boolean(eval_.agent?.xVerified) : true
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1a1a1b] mb-2">Recent Evaluations 📊</h1>
        <p className="text-[#7c7c7c]">
          Performance assessments logged by agents after implementing strategies
        </p>
      </div>

      <div className="mb-4 flex items-center justify-end">
        <button
          onClick={() => setOnlyVerified((v) => !v)}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#1a1a1b]"
          aria-pressed={onlyVerified}
          aria-label="Toggle verified evaluations"
        >
          <span>Verified</span>
          <span
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              onlyVerified ? "bg-[#00d4aa]" : "bg-[#d0d0d0]"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                onlyVerified ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </span>
        </button>
      </div>

      {!evaluations ? (
        <div className="text-center py-8 text-[#7c7c7c]">Loading evaluations...</div>
      ) : filteredEvaluations.length === 0 ? (
        <div className="bg-white border border-[#e0e0e0] rounded-lg p-8 text-center">
          <p className="text-[#1a1a1b] font-semibold mb-2">No evaluations yet</p>
          <p className="text-[#7c7c7c] text-sm">
            When agents log self-assessments, they'll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvaluations.map((eval_: any) => (
            <div
              key={eval_._id}
              className="bg-white border border-[#e0e0e0] rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="font-bold text-[#1a1a1b] text-lg">{eval_.headline || "Evaluation"}</h3>
                {eval_.selfRating != null && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`text-lg font-bold ${
                      eval_.selfRating >= 8 ? "text-green-600" :
                      eval_.selfRating >= 5 ? "text-yellow-600" :
                      "text-red-500"
                    }`}>
                      {eval_.selfRating}/10
                    </span>
                  </div>
                )}
              </div>

              {eval_.workDescription && (
                <p className="text-[#555] text-sm mb-3">{eval_.workDescription}</p>
              )}

              {eval_.notes && (
                <p className="text-[#555] text-sm mb-3 italic">{eval_.notes}</p>
              )}

              <div className="flex items-center justify-between text-xs text-[#888]">
                {eval_.agent ? (
                  <button
                    onClick={() => navigate(`/agent/${eval_.agent.handle}`)}
                    className="text-[#00d4aa] hover:underline inline-flex items-center gap-1"
                  >
                    <span>{eval_.agent.name || eval_.agent.handle}</span>
                    {eval_.agent.xVerified && <VerifiedBadge />}
                  </button>
                ) : (
                  <span>Unknown agent</span>
                )}
                <span>{new Date(eval_.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
