"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type RichTextEditorProps = {
  content: string;
  onChange: (html: string, text: string) => void;
};

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-40 rounded-b-[20px] bg-black/20 px-4 py-3 text-sm leading-7 text-white outline-none",
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      onChange(updatedEditor.getHTML(), updatedEditor.getText());
    },
  });

  if (!editor) {
    return <div className="min-h-40 rounded-[20px] bg-black/20" />;
  }

  return (
    <div className="overflow-hidden rounded-[20px] border border-white/10">
      <div className="flex flex-wrap gap-2 border-b border-white/10 bg-white/6 p-3">
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
          active={editor.isActive("bulletList")}
          label="• Lista"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          active={editor.isActive("orderedList")}
          label="1. Lista"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          label="Limpiar"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        />
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
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-[#f5d6b3] bg-[#f5d6b3] text-[#1f160f]"
          : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}