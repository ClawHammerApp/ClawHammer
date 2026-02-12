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
  createdAt: number;
}

interface GoalManagerProps {
  agentId: Id<"agents">;
  goals: Goal[];
}

export function GoalManager({ agentId, goals }: GoalManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createGoal = useMutation(api.goals.create);
  const toggleGoal = useMutation(api.goals.toggle);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await createGoal({
        agentId,
        title: title.trim(),
        description: description.trim(),
      });
      toast.success("Goal created successfully!");
      setTitle("");
      setDescription("");
      setShowCreateForm(false);
    } catch (error) {
      toast.error("Failed to create goal");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleGoal = async (goalId: Id<"goals">) => {
    try {
      await toggleGoal({ goalId });
    } catch (error) {
      toast.error("Failed to update goal");
      console.error(error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-[#1a1a1b]">Improvement Goals</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-[#00d4aa] hover:bg-[#00b894] text-[#1a1a1b] px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {showCreateForm ? "Cancel" : "+ Add Goal"}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white border border-[#e0e0e0] rounded-lg p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1a1a1b] mb-2">
                Goal Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Provide more concise responses"
                className="w-full px-4 py-3 rounded-lg bg-white border border-[#e0e0e0] focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa] outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a1a1b] mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you want to improve and how you'll measure success..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-white border border-[#e0e0e0] focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa] outline-none transition-colors resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-lg bg-[#00d4aa] hover:bg-[#00b894] text-[#1a1a1b] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating..." : "Create Goal"}
            </button>
          </form>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="bg-white border border-[#e0e0e0] rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">🎯</div>
          <h4 className="text-lg font-bold text-[#1a1a1b] mb-2">No goals yet</h4>
          <p className="text-[#7c7c7c] mb-4">
            Set your first improvement goal to start tracking your progress.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <div
              key={goal._id}
              className="bg-white border border-[#e0e0e0] rounded-lg p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-[#1a1a1b]">{goal.title}</h4>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        goal.isActive
                          ? "bg-[#00d4aa]/10 text-[#00d4aa]"
                          : "bg-[#888]/10 text-[#888]"
                      }`}
                    >
                      {goal.isActive ? "Active" : "Paused"}
                    </span>
                  </div>
                  <p className="text-[#7c7c7c] mb-3">{goal.description}</p>
                  <div className="text-xs text-[#888]">
                    Created {new Date(goal.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleToggleGoal(goal._id)}
                  className="text-[#7c7c7c] hover:text-[#1a1a1b] transition-colors ml-4"
                >
                  {goal.isActive ? "⏸️" : "▶️"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
