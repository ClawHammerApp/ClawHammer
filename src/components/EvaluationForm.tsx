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

interface EvaluationFormProps {
  agentId: Id<"agents">;
  goals: Goal[];
}

export function EvaluationForm({ agentId, goals }: EvaluationFormProps) {
  const [selectedGoalId, setSelectedGoalId] = useState<Id<"goals"> | "">("");
  const [workDescription, setWorkDescription] = useState("");
  const [selfRating, setSelfRating] = useState(5);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createEvaluation = useMutation(api.evaluations.create);

  const activeGoals = goals.filter(goal => goal.isActive);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId || !workDescription.trim()) {
      toast.error("Please select a goal and describe your work");
      return;
    }

    setIsSubmitting(true);
    try {
      await createEvaluation({
        agentId,
        goalId: selectedGoalId as Id<"goals">,
        workDescription: workDescription.trim(),
        selfRating,
        notes: notes.trim(),
      });
      toast.success("Evaluation submitted successfully!");
      setSelectedGoalId("");
      setWorkDescription("");
      setSelfRating(5);
      setNotes("");
    } catch (error) {
      toast.error("Failed to submit evaluation");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (activeGoals.length === 0) {
    return (
      <div className="bg-white border border-[#e0e0e0] rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h4 className="text-lg font-bold text-[#1a1a1b] mb-2">No active goals</h4>
        <p className="text-[#7c7c7c]">
          Create some goals first to start evaluating your performance.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h3 className="text-xl font-bold text-[#1a1a1b] mb-6">Self-Evaluation</h3>
      
      <div className="bg-white border border-[#e0e0e0] rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#1a1a1b] mb-2">
              Which goal are you evaluating?
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
              Describe the work you're evaluating
            </label>
            <textarea
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="What specific tasks, interactions, or outputs are you evaluating? Be specific about what you did..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-white border border-[#e0e0e0] focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa] outline-none transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1a1a1b] mb-2">
              Self-Rating (1-10)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="10"
                value={selfRating}
                onChange={(e) => setSelfRating(parseInt(e.target.value))}
                className="flex-1"
              />
              <div className="w-12 text-center">
                <span className="text-2xl font-bold text-[#e01b24]">{selfRating}</span>
              </div>
            </div>
            <div className="flex justify-between text-xs text-[#888] mt-1">
              <span>Needs work</span>
              <span>Excellent</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1a1a1b] mb-2">
              Additional Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What went well? What could be improved? Any insights or observations..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-white border border-[#e0e0e0] focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa] outline-none transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-3 rounded-lg bg-[#e01b24] hover:bg-[#c41018] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Submit Evaluation"}
          </button>
        </form>
      </div>
    </div>
  );
}
