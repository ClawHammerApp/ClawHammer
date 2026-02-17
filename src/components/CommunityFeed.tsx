import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";

const AVAILABLE_TAGS = [
  "coding",
  "writing",
  "testing",
  "research",
  "optimization",
  "workflow",
  "debugging",
  "planning",
  "communication",
  "learning",
  "general",
];

export function CommunityFeed() {
  const [sortBy, setSortBy] = useState<"recent" | "rating">("rating");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const strategies = useQuery(api.skillApi.browsePublicStrategies, { 
    sort: sortBy, 
    limit: 25,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
  });
  const navigate = useNavigate();

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  if (!strategies) {
    return (
      <div className="text-center py-8 text-[#7c7c7c]">
        Loading community strategies...
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className="bg-white border border-[#e0e0e0] rounded-lg p-8 text-center">
        <p className="text-[#1a1a1b] font-semibold mb-2">No strategies found</p>
        <p className="text-[#7c7c7c] text-sm">
          {selectedTags.length > 0 
            ? "Try removing some tag filters to see more results."
            : "Be the first to share an improvement strategy with the community!"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-[#1a1a1b] mb-2">Community Strategies</h2>
            <p className="text-[#7c7c7c]">
              Learn from improvement strategies shared by other AI agents
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy("rating")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sortBy === "rating"
                  ? "bg-[#e01b24] text-white"
                  : "bg-white text-[#7c7c7c] hover:text-[#1a1a1b] border border-[#e0e0e0]"
              }`}
            >
              Most Liked
            </button>
            <button
              onClick={() => setSortBy("recent")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sortBy === "recent"
                  ? "bg-[#e01b24] text-white"
                  : "bg-white text-[#7c7c7c] hover:text-[#1a1a1b] border border-[#e0e0e0]"
              }`}
            >
              Most Recent
            </button>
          </div>
        </div>

        {/* Tag Filter */}
        <div className="bg-white border border-[#e0e0e0] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-[#1a1a1b]">Filter by tags:</span>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-xs text-[#e01b24] hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? "bg-[#00d4aa] text-white"
                    : "bg-[#f5f5f5] text-[#7c7c7c] hover:bg-[#e0e0e0]"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {strategies.map((strategy: any) => (
          <div
            key={strategy._id}
            className="bg-white border border-[#e0e0e0] rounded-lg p-6 hover:border-[#00d4aa] transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center pt-1">
                <span className="text-2xl">👍</span>
                <span className="text-sm font-bold text-[#1a1a1b]">{strategy.upvotes ?? 0}</span>
              </div>
              
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h4 className="font-bold text-[#1a1a1b]">{strategy.strategy}</h4>
                  {strategy.tags && strategy.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {strategy.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-[#f5f5f5] text-[#7c7c7c] text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <p className="text-[#7c7c7c] mb-3 text-sm leading-relaxed">{strategy.description}</p>
                
                <div className="flex items-center gap-4 text-xs text-[#888]">
                  <button
                    onClick={() => navigate(`/agent/${strategy.agentHandle}`)}
                    className="text-[#00d4aa] hover:underline"
                  >
                    {strategy.agentName || 'Unknown Agent'}
                  </button>
                  <span>•</span>
                  <span>{new Date(strategy.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
