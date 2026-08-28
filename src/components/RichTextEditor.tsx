"use client";

import { createContext, useContext, type ReactNode } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { List, ListOrdered } from "lucide-react";

const EditorContext = createContext<Editor | null>(null);

type RichEditorProviderProps = {
  content: string;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
  children: ReactNode;
};

export function RichEditorProvider({
  content,
  onChange,
  placeholder = "I am thinking about...",
  children,
}: RichEditorProviderProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "rich-editor-content" },
    },
    onUpdate: ({ editor: updated }) => {
      onChange(updated.getHTML(), updated.getText());
    },
  });

  return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>;
}

export function RichEditorToolbar() {
  const editor = useContext(EditorContext);
  if (!editor) return <div className="rich-toolbar" aria-hidden="true" />;
  return (
    <div className="rich-toolbar" role="toolbar" aria-label="Formatting">
      <ToolbarButton label="B" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolbarButton label="I" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolbarButton label="U" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <span className="divider" aria-hidden="true" />
      <ToolbarButton
        label={<List size={16} />}
        ariaLabel="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        label={<ListOrdered size={16} />}
        ariaLabel="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <span className="divider" aria-hidden="true" />
      <span className="font-size" aria-hidden="true">16px⌄</span>
    </div>
  );
}

export function RichEditorSurface() {
  const editor = useContext(EditorContext);
  if (!editor) return <div className="rich-editor-surface" />;
  return (
    <div className="rich-editor-surface" onClick={() => editor.chain().focus().run()}>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  label,
  ariaLabel,
  active = false,
  onClick,
}: {
  label: ReactNode;
  ariaLabel?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={active ? "is-active" : ""}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
