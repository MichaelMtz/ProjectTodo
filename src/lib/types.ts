import { Doc } from "../../convex/_generated/dataModel";

export type ChecklistPreviewItem = {
  text: string;
  done: boolean;
};

export type TodoCard = Doc<"todos"> & {
  authorName: string;
  checklistTotal: number;
  checklistDone: number;
  checklistPreview: ChecklistPreviewItem[];
  commentCount: number;
};
