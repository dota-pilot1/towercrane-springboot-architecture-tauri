import { useCallback, useEffect, useMemo } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin'
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode'
import { TablePlugin } from '@lexical/react/LexicalTablePlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { TRANSFORMERS } from '@lexical/markdown'
import { CodeNode, CodeHighlightNode, registerCodeHighlighting } from '@lexical/code'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { LinkNode } from '@lexical/link'
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table'
import { type EditorState } from 'lexical'
import { editorTheme } from './theme'
import { LexicalToolbar } from './toolbar'
import { ImageNode } from './nodes/image-node'
import { YoutubeNode } from './nodes/youtube-node'
import { DragDropImagePlugin, ImagePlugin } from './plugins/image-plugin'
import { YoutubePlugin } from './plugins/youtube-plugin'
import { TableActionMenuPlugin } from './plugins/table-action-plugin'
import { uploadImageToS3 } from './utils/upload-image'

type LexicalEditorProps = {
  initialState?: string
  onChange: (state: string) => void
  placeholder?: string
  minHeight?: string
  readOnly?: boolean
  toolbarVariant?: 'full' | 'simple'
}

function CodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext()
  useEffect(() => registerCodeHighlighting(editor), [editor])
  return null
}

function EditablePlugin({ readOnly }: { readOnly: boolean }) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    editor.setEditable(!readOnly)
  }, [editor, readOnly])
  return null
}

function isValidLexicalJson(value: string): boolean {
  try {
    const parsed = JSON.parse(value)
    return Boolean(parsed?.root)
  } catch {
    return false
  }
}

export function LexicalEditor({
  initialState,
  onChange,
  placeholder = '내용을 입력하세요...',
  minHeight = '200px',
  readOnly = false,
  toolbarVariant = 'full',
}: LexicalEditorProps) {
  const handleChange = useCallback(
    (editorState: EditorState) => {
      onChange(JSON.stringify(editorState.toJSON()))
    },
    [onChange],
  )

  const initialConfig = useMemo(
    () => ({
      namespace: 'DocuNoteEditor',
      theme: editorTheme,
      editable: !readOnly,
      editorState:
        initialState && isValidLexicalJson(initialState) ? initialState : undefined,
      nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        CodeNode,
        CodeHighlightNode,
        LinkNode,
        HorizontalRuleNode,
        TableNode,
        TableCellNode,
        TableRowNode,
        ImageNode,
        YoutubeNode,
      ],
      onError: (error: Error) => {
        console.error('Lexical error:', error)
      },
    }),
    // initialState is only used as the mount seed; block remount churn while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [readOnly],
  )

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="flex flex-col bg-surface-raised">
        {readOnly ? null : (
          <LexicalToolbar
            onImageUpload={toolbarVariant === 'full' ? uploadImageToS3 : undefined}
            variant={toolbarVariant}
          />
        )}
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="px-5 py-5 text-sm leading-relaxed text-text-primary outline-none"
                style={{ minHeight }}
              />
            }
            placeholder={
              readOnly ? null : (
                <div className="absolute top-4 left-5 text-sm text-text-muted pointer-events-none">
                  {placeholder}
                </div>
              )
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        {readOnly ? null : <HistoryPlugin />}
        <ListPlugin />
        <CheckListPlugin />
        <LinkPlugin />
        <HorizontalRulePlugin />
        <TablePlugin hasHorizontalScroll />
        <CodeHighlightPlugin />
        {readOnly ? null : <MarkdownShortcutPlugin transformers={TRANSFORMERS} />}
        {readOnly ? null : <ImagePlugin />}
        {readOnly ? null : <DragDropImagePlugin onUpload={uploadImageToS3} />}
        {readOnly ? null : <YoutubePlugin />}
        {readOnly ? null : <TableActionMenuPlugin />}
        <OnChangePlugin onChange={handleChange} />
        <EditablePlugin readOnly={readOnly} />
      </div>
    </LexicalComposer>
  )
}
