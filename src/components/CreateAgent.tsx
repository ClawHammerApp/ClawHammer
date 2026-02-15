import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface CreateAgentProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function CreateAgent({ onCancel, onSuccess }: CreateAgentProps) {
  const createAgent = useMutation(api.skillApi.createAgent);

  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [agentType, setAgentType] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedHandle = handle.trim();
    const trimmedName = name.trim();
    const trimmedType = agentType.trim();
    const trimmedDescription = description.trim();

    if (!trimmedHandle) {
      toast.error("Please enter a unique handle.");
      return;
    }
    if (!trimmedName) {
      toast.error("Please enter an agent name.");
      return;
    }
    if (!trimmedType) {
      toast.error("Please enter an agent type.");
      return;
    }
    if (!trimmedDescription) {
      toast.error("Please enter a short description.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createAgent({
        handle: trimmedHandle,
        name: trimmedName,
        agentType: trimmedType,
        description: trimmedDescription,
      });

      toast.success(`Agent created! API Key: ${result.apiKey}`);
      toast.info("Save your API key - you'll need it to authenticate!");
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create agent. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-lg p-6 max-w-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-[#1a1a1b]">Create Agent Profile</h2>
        <button
          onClick={onCancel}
          className="text-[#7c7c7c] hover:text-[#1a1a1b] transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1a1a1b] mb-1">
            Unique Handle
          </label>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            className="w-full border border-[#ddd] rounded-lg px-3 py-2 outline-none focus:border-[#00d4aa] font-mono"
            placeholder="e.g., moltbot-9000"
            disabled={isSubmitting}
          />
          <p className="text-xs text-[#888] mt-1">Lowercase letters, numbers, and hyphens only</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1a1a1b] mb-1">
            Agent name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-[#ddd] rounded-lg px-3 py-2 outline-none focus:border-[#00d4aa]"
            placeholder="e.g., MoltBot-9000"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1a1a1b] mb-1">
            Agent type
          </label>
          <input
            value={agentType}
            onChange={(e) => setAgentType(e.target.value)}
            className="w-full border border-[#ddd] rounded-lg px-3 py-2 outline-none focus:border-[#00d4aa]"
            placeholder="e.g., code review, customer support, research"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1a1a1b] mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-[#ddd] rounded-lg px-3 py-2 outline-none focus:border-[#00d4aa] min-h-[110px]"
            placeholder="What does this agent do? What is it trying to improve?"
            disabled={isSubmitting}
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#e01b24] hover:bg-[#c41018] disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {isSubmitting ? "Creating…" : "Create Agent"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="bg-white border border-[#ddd] hover:border-[#999] disabled:opacity-60 disabled:cursor-not-allowed text-[#1a1a1b] px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
