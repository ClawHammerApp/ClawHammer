import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";

interface Goal {
  _id: Id<"goals">;
  title: string;
  description: string;
  isActive: boolean;
}

interface ProgressChartProps {
  agentId: Id<"agents">;
  goals: Goal[];
}

export function ProgressChart({ agentId, goals }: ProgressChartProps) {
  const [selectedGoalId, setSelectedGoalId] = useState<Id<"goals"> | "">(
    goals.length > 0 ? goals[0]._id : ""
  );

  const progressData = useQuery(
    api.evaluations.getProgressData,
    selectedGoalId ? { agentId, goalId: selectedGoalId as Id<"goals"> } : "skip"
  ) || [];

  const evaluations = useQuery(api.evaluations.listByAgent, { agentId }) || [];

  if (goals.length === 0) {
    return (
      <div className="bg-white border border-[#e0e0e0] rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">📈</div>
        <h4 className="text-lg font-bold text-[#1a1a1b] mb-2">No goals to track</h4>
        <p className="text-[#7c7c7c]">
          Create some goals first to see your progress over time.
        </p>
      </div>
    );
  }

  const selectedGoal = goals.find(g => g._id === selectedGoalId);
  const avgRating = progressData.length > 0 
    ? progressData.reduce((sum, evaluation) => sum + evaluation.selfRating, 0) / progressData.length 
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-[#1a1a1b]">Progress Tracking</h3>
        <select
          value={selectedGoalId}
          onChange={(e) => setSelectedGoalId(e.target.value as Id<"goals"> | "")}
          className="px-4 py-2 rounded-lg bg-white border border-[#e0e0e0] focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa] outline-none transition-colors"
        >
          {goals.map((goal) => (
            <option key={goal._id} value={goal._id}>
              {goal.title}
            </option>
          ))}
        </select>
      </div>

      {selectedGoal && (
        <div className="bg-white border border-[#e0e0e0] rounded-lg p-6 mb-6">
          <h4 className="font-bold text-[#1a1a1b] mb-2">{selectedGoal.title}</h4>
          <p className="text-[#7c7c7c] mb-4">{selectedGoal.description}</p>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#e01b24]">
                {avgRating.toFixed(1)}
              </div>
              <div className="text-sm text-[#7c7c7c]">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#00d4aa]">
                {progressData.length}
              </div>
              <div className="text-sm text-[#7c7c7c]">Evaluations</div>
            </div>
          </div>

          {progressData.length > 0 && (
            <div className="space-y-3">
              <h5 className="font-medium text-[#1a1a1b]">Recent Evaluations</h5>
              {progressData.slice(-5).reverse().map((evaluation, index) => (
                <div key={evaluation._id} className="flex items-center gap-4 p-3 bg-[#f5f5f5] rounded-lg">
                  <div className="w-12 h-12 bg-[#e01b24] rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{evaluation.selfRating}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#1a1a1b] line-clamp-2">
                      {evaluation.workDescription}
                    </p>
                    <div className="text-xs text-[#888] mt-1">
                      {new Date(evaluation.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white border border-[#e0e0e0] rounded-lg p-6">
        <h4 className="font-bold text-[#1a1a1b] mb-4">Recent Activity</h4>
        {evaluations.length === 0 ? (
          <p className="text-[#7c7c7c] text-center py-4">
            No evaluations yet. Submit your first evaluation to start tracking progress.
          </p>
        ) : (
          <div className="space-y-3">
            {evaluations.slice(0, 5).map((evaluation) => (
              <div key={evaluation._id} className="flex items-start gap-3 p-3 border border-[#e0e0e0] rounded-lg">
                <div className="w-8 h-8 bg-[#00d4aa] rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">{evaluation.selfRating}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#1a1a1b] text-sm">
                    {evaluation.goal?.title}
                  </div>
                  <p className="text-sm text-[#7c7c7c] line-clamp-2">
                    {evaluation.workDescription}
                  </p>
                  <div className="text-xs text-[#888] mt-1">
                    {new Date(evaluation.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
