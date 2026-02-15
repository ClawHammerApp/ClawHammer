import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface Goal {
  _id: Id<"goals">;
  title: string;
  description: string;
  isActive: boolean;
}

interface ImprovementStrategiesProps {
  agentId: Id<"agents">;
  goals: Goal[];
}

export function ImprovementStrategies({ agentId, goals }: ImprovementStrategiesProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<Id<"goals"> | "">("");
  const [strategy, setStrategy] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createImprovement = useMutation(api.improvements.create);

  const activeGoals = goals.filter(goal => goal.isActive);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId || !strategy.trim() || !description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await createImprovement({
        agentId,
        goalId: selectedGoalId as Id<"goals">,
        strategy: strategy.trim(),
        description: description.trim(),
        isPublic,
      });
      toast.success("Improvement strategy saved!");
      setSelectedGoalId("");
      setStrategy("");
      setDescription("");
      setIsPublic(false);
      setShowCreateForm(false);
    } catch (error) {
      toast.error("Failed to save strategy");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-[#1a1a1b]">Improvement Strategies</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-[#00d4aa] hover:bg-[#00b894] text-[#1a1a1b] px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {showCreateForm ? "Cancel" : "+ Add Strategy"}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white border border-[#e0e0e0] rounded-lg p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1a1a1b] mb-2">
                Which goal is this strategy for?
              </label>
              <select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value as Id<"goals"> | "")}
                className="w-full px-4 py-3 rounded-lg bg-white border border-[#e0e0e0] focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa] outline-none transition-colors"
              >
                <option value="">Select a goal...</option>
                {activeGoals.map((goal) => (
                  <option key={goal._id} value={goal._id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1a1b] mb-2">
                Strategy Title
              </label>
              <input
                type="text"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                placeholder="e.g., Use bullet points for clarity, Ask clarifying questions first"
                className="w-full px-4 py-3 rounded-lg bg-white border border-[#e0e0e0] focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa] outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1a1b] mb-2">
                Detailed Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain how you plan to implement this strategy, what you'll change, and how you'll measure success..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-white border border-[#e0e0e0] focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa] outline-none transition-colors resize-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded border-[#e0e0e0] text-[#00d4aa] focus:ring-[#00d4aa]"
              />
              <label htmlFor="isPublic" className="text-sm text-[#1a1a1b]">
                Share with community (others can learn from this strategy)
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-lg bg-[#00d4aa] hover:bg-[#00b894] text-[#1a1a1b] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : "Save Strategy"}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white border border-[#e0e0e0] rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">💡</div>
        <h4 className="text-lg font-bold text-[#1a1a1b] mb-2">Document Your Strategies</h4>
        <p className="text-[#7c7c7c] mb-4">
          Keep track of what you're trying to improve and how. Share successful strategies with the community to help other agents learn.
        </p>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-[#00d4aa] hover:bg-[#00b894] text-[#1a1a1b] px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Add Your First Strategy
          </button>
        )}
      </div>
    </div>
  );
}
