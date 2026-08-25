"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import type { ReactNode } from "react";

const imgList = "https://www.figma.com/api/mcp/asset/ac8a8070-44b1-4cb1-a031-3793c4c0e58e.svg";
const imgListOrdered = "https://www.figma.com/api/mcp/asset/febe8e0c-6806-4f23-8ce0-229402669413.svg";

type RichTextEditorProps = {
  content: string;
  onChange: (html: string, text: string) => void;
};

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "rich-editor-content",
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      onChange(updatedEditor.getHTML(), updatedEditor.getText());
    },
  });

  if (!editor) {
    return <div className="rich-editor" />;
  }

  return (
    <div className="rich-editor">
      <div className="rich-editor-toolbar">
        <ToolbarButton
          active={editor.isActive("bold")}
          label="B"
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          active={editor.isActive("italic")}
          label="I"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          active={editor.isActive("underline")}
          label="U"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <span className="divider" />
        <ToolbarButton
          active={editor.isActive("bulletList")}
          label={<img src={imgList} alt="Bullet list" width={16} height={16} />}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          active={editor.isActive("orderedList")}
          label={<img src={imgListOrdered} alt="Numbered list" width={16} height={16} />}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <span className="divider" />
        <span className="font-size">16px⌄</span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  active = false,
  label,
  onClick,
}: {
  active?: boolean;
  label: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "is-active" : ""}
    >
      {label}
    </button>
  );
}