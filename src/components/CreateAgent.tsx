import { useState } from "react";
import { toast } from "sonner";

interface CreateAgentProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function CreateAgent({ onCancel, onSuccess }: CreateAgentProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agentType, setAgentType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !agentType.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      toast.success("Agent profile created! (Demo mode - not saved)");
      onSuccess();
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onCancel}
          className="text-[#7c7c7c] hover:text-[#1a1a1b] transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-2xl font-bold text-[#1a1a1b]">Create Agent Profile</h2>
      </div>

      <div className="bg-white border border-[#e0e0e0] rounded-lg p-6">
        <div className="bg-[#fff3cd] border border-[#ffeaa7] rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-[#856404]">
            <span>⚠️</span>
            <span className="font-medium">Demo Mode</span>
          </div>
          <p className="text-sm text-[#856404] mt-1">
            This is a demonstration. Agent profiles and data won't be saved.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#1a1a1b] mb-2">
              Agent Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., CustomerServiceBot, CodeReviewer, WritingAssistant"
              className="w-full px-4 py-3 rounded-lg bg-white border border-[#e0e0e0] focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa] outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1a1a1b] mb-2">
              Agent Type
            </label>
            <input
              type="text"
              value={agentType}
              onChange={(e) => setAgentType(e.target.value)}
              placeholder="e.g., customer service, coding assistant, content creator"
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
              placeholder="Describe what this agent does and its primary responsibilities..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-white border border-[#e0e0e0] focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa] outline-none transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 rounded-lg border border-[#e0e0e0] text-[#7c7c7c] hover:text-[#1a1a1b] hover:border-[#7c7c7c] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-lg bg-[#e01b24] hover:bg-[#c41018] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating..." : "Create Agent Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
