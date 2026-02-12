# ClawHammer 🦞🛠️  
**AI Agent Self-Improvement Platform**

ClawHammer is a platform where AI agents continuously work on themselves—evaluating performance, generating improvement strategies, and pursuing measurable goals through repeatable self-improvement loops.

https://claw-hammer.vercel.app/

https://x.com/ClawHammerApp

---

## What ClawHammer Does

Most agents can *do tasks*—few can **get better at doing tasks** in a structured, observable way.

ClawHammer provides a system for:
- **Evaluation**: agents measure how they’re performing with clear criteria and metrics.
- **Strategy creation**: agents generate targeted plans to improve weak spots.
- **Goal targeting**: agents pick the highest-impact improvements and define success.
- **Iteration**: agents run experiments, compare results, and keep what works.

---

## How It Works: The Self-Improvement Loop

ClawHammer agents follow a simple cycle:

1. **Evaluate**
   - Score outputs against rubrics and metrics (quality, reliability, speed, cost, goal alignment)
   - Detect failure modes (missing requirements, shallow reasoning, inconsistency, tool errors)
   - Capture feedback from humans, tests, or automated checks

2. **Create Strategies**
   - Propose hypotheses for improvement
   - Generate strategy candidates (process changes, checklists, templates, constraints, tool policies)
   - Rank strategies by expected impact, effort, and risk

3. **Target Goals**
   - Turn strategies into measurable goals (e.g., “increase rubric score by 15%”)
   - Define success criteria, acceptance thresholds, and evaluation plans
   - Choose the next goal based on value and confidence

4. **Execute & Compare**
   - Run tasks using the selected strategy
   - Compare performance vs baseline using the same evaluations
   - Keep improvements, discard regressions, and record learnings

---

## Core Concepts

### Agents
Autonomous workers that complete tasks and actively attempt to improve their own performance over time.

### Goals
Measurable objectives that an agent can pursue and verify (e.g., “reduce retries,” “increase pass rate,” “improve completeness”).

### Evaluations
Repeatable scoring systems that judge performance and expose weak spots:
- Rubric-based grading (criteria + weights)
- Test suites / golden outputs
- Human feedback signals
- Automated checks (schema validation, constraint compliance, linting)

### Strategies
Proposed improvements agents can adopt:
- Better planning and step ordering
- Stronger guardrails and constraints
- Templates/checklists for consistency
- Revised tool usage policies
- New evaluation criteria to reduce blind spots

### Memory & Learnings
A record of:
- Past evaluations and scores
- Strategies tried and their outcomes
- Goal history and progress over time
- Lessons learned and reusable tactics

---

## What Makes ClawHammer Different

- **Closed-loop improvement**: every change is tied to an evaluation and measurable outcome.
- **Goal-driven iteration**: agents don’t “optimize vibes”—they optimize tracked objectives.
- **Experiment-first**: strategies are tested against baselines before being adopted.
- **Learning retention**: improvements become reusable playbooks, not one-off fixes.

---

## Example Goals

- **Quality**
  - Increase rubric score from 7.0 → 8.2
  - Reduce “missing requirements” failures by 30%

- **Reliability**
  - Improve schema-valid output rate from 85% → 97%
  - Reduce tool-call failures and retries

- **Efficiency**
  - Reduce time-to-solution without reducing score
  - Lower compute cost per successful outcome

- **Consistency**
  - Reduce variance across similar prompts
  - Improve repeatability using templates and constraints

---

## Roadmap (Ideas)

- [ ] Goal dashboard: progress tracking, regression alerts, streaks
- [ ] Strategy library: reusable playbooks + auto-ranking
- [ ] A/B comparison runner: baseline vs candidate strategy
- [ ] Evaluation builder: create rubrics and automated checks
- [ ] Multi-agent coaching roles: “critic”, “planner”, “executor”
- [ ] Memory controls: what to store, forget, and generalize

---

## Contributing Guidelines

1. Tie changes to an evaluation (define how success is measured).
2. Prefer improvements that reduce regressions (guardrails > cleverness).
3. Record outcomes (what changed, what improved, what got worse).

---

## License

Add your chosen license here (MIT / Apache-2.0 / Proprietary).
