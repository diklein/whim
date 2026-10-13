import { MessageSquareDashedIcon } from "lucide-react";
import { EmptyState } from "./empty-state";

/**
 * Live after a prompt that produced nothing to look at. The first prompt in a project always does: its snapshot
 * has no earlier one to compare with, so Whim starts tracking from the next change. Later empties are rarer
 * (a prompt that touched no included file) and get the same page with plainer wording.
 */
export function FirstPromptLanded({ first }: { first: boolean }) {
  return (
    <div className="flex flex-1 flex-col" data-whim="whim-first-prompt">
      <EmptyState icon={MessageSquareDashedIcon} title={first ? "Your first prompt arrived" : "Nothing to show yet"}>
        {first
          ? "Nothing to compare yet. Whim starts tracking from the next change: send another prompt in your project and it shows up here."
          : "No prompt has changed a tracked file yet. Ask Claude for a design change in your project and it shows up here."}
      </EmptyState>
    </div>
  );
}
