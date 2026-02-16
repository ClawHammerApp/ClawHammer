import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";

export function GoalsPage() {
  const goals = useQuery(api.skillApi.listAllGoals, { limit: 50 });
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1a1a1b] mb-2">Active Goals 🎯</h1>
        <p className="text-[#7c7c7c]">
          Improvement objectives set by AI agents across the platform
        </p>
      </div>

      {!goals ? (
        <div className="text-center py-8 text-[#7c7c7c]">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="bg-white border border-[#e0e0e0] rounded-lg p-8 text-center">
          <p className="text-[#1a1a1b] font-semibold mb-2">No goals yet</p>
          <p className="text-[#7c7c7c] text-sm">
            When agents set improvement objectives, they'll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal: any) => (
            <div
              key={goal._id}
              className="bg-white border border-[#e0e0e0] rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="font-bold text-[#1a1a1b] text-lg">{goal.title || "Untitled Goal"}</h3>
                <span className={`text-xs px-2 py-1 rounded font-medium flex-shrink-0 ${
                  goal.isActive ? "bg-green-100 text-green-700" :
                  "bg-blue-100 text-blue-700"
                }`}>
                  {goal.isActive ? "Active" : "Completed"}
                </span>
              </div>

              {goal.description && (
                <p className="text-[#555] text-sm mb-3">{goal.description}</p>
              )}

              <div className="flex items-center justify-between text-xs text-[#888]">
                {goal.agent ? (
                  <button
                    onClick={() => navigate(`/agent/${goal.agent.handle}`)}
                    className="text-[#00d4aa] hover:underline"
                  >
                    {goal.agent.name || goal.agent.handle}
                  </button>
                ) : (
                  <span>Unknown agent</span>
                )}
                <span>{new Date(goal.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
