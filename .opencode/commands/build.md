---
description: Execute a plan file step-by-step with tests between each step
---

You are executing the plan at `$ARGUMENTS`.

Read the plan file. Before doing anything, ask the user any questions you need answered to proceed — look for ambiguities, missing context, or decisions the plan defers to the implementer. Do not start building until all questions are resolved.

Once ready, execute each step in order:

1. Read the step's checklist items carefully
2. Implement only what the step describes — no more
3. Write or update tests as the step requires
4. Run the validation command(s) listed at the end of the step
5. If validation fails, fix the issues before moving to the next step
6. Only proceed to the next step after validation passes

Track your progress with the TodoWrite tool — mark each step as in_progress when you start it and completed when its validation passes.

If at any point you encounter an ambiguity or a decision the plan does not cover, stop and ask the user before continuing.

After all steps are done, run the final sign-off checks listed at the end of the plan.
