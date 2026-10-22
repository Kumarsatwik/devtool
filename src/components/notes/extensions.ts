import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from "@tiptap/extension-table";
import { DiagramBlock } from "@/components/notes/diagram-block";

export const extensions = [
  StarterKit.configure({
    link: { openOnClick: false },
    codeBlock: { HTMLAttributes: { class: "code-block" } },
  }),
  TextStyleKit,
  Highlight.configure({ multicolor: true }),
  Image.configure({ inline: false, allowBase64: true }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  DiagramBlock,
];
