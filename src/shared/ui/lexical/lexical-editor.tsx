import { useCallback, useEffect, useMemo, useState } from 'react'
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

type SerializedLexicalNode = {
  type?: string
  language?: string | null
  text?: string
  children?: SerializedLexicalNode[]
}

type MermaidBlock = {
  id: string
  source: string
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

function getSerializedNodeText(node: SerializedLexicalNode): string {
  if (typeof node.text === 'string') return node.text
  return node.children?.map(getSerializedNodeText).join('') ?? ''
}

function isMermaidSource(source: string): boolean {
  return /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|requirementDiagram|C4Context|architecture-beta|block-beta)\b/.test(
    source.trim(),
  )
}

function collectMermaidBlocks(node: SerializedLexicalNode, blocks: MermaidBlock[]) {
  const language = node.language?.toLowerCase()
  if (node.type === 'code') {
    const source = getSerializedNodeText(node).trim()
    if (source && (language === 'mermaid' || language === 'mmd' || isMermaidSource(source))) {
      blocks.push({
        id: `${blocks.length}-${source.length}`,
        source,
      })
    }
    return
  }

  node.children?.forEach((child) => collectMermaidBlocks(child, blocks))
}

function extractMermaidBlocks(value?: string): MermaidBlock[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as { root?: SerializedLexicalNode }
    const blocks: MermaidBlock[] = []
    if (parsed.root) collectMermaidBlocks(parsed.root, blocks)
    return blocks
  } catch {
    return []
  }
}

function MermaidPreview({
  block,
  index,
}: {
  block: MermaidBlock
  index: number
}) {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false

    async function render() {
      try {
        setError(null)
        setSvg(null)
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: {
            primaryColor: '#ffffff',
            primaryBorderColor: '#059669',
            primaryTextColor: '#111827',
            lineColor: '#374151',
            secondaryColor: '#f8fafc',
            secondaryBorderColor: '#94a3b8',
            secondaryTextColor: '#111827',
            tertiaryColor: '#ecfdf5',
            tertiaryBorderColor: '#059669',
            tertiaryTextColor: '#111827',
            fontFamily: 'Pretendard Variable, Pretendard, sans-serif',
          },
        })
        const id = `lexical-mermaid-${Date.now()}-${index}`
        const result = await mermaid.render(id, block.source)
        if (!disposed) setSvg(result.svg)
      } catch (renderError) {
        if (!disposed) {
          setError(
            renderError instanceof Error
              ? renderError.message
              : 'Mermaid 다이어그램을 렌더링하지 못했습니다.',
          )
        }
      }
    }

    void render()

    return () => {
      disposed = true
    }
  }, [block.source, index])

  if (error) {
    return <div className="lexical-mermaid-preview lexical-mermaid-preview-error">{error}</div>
  }

  if (!svg) {
    return <div className="lexical-mermaid-preview">다이어그램 렌더링 중...</div>
  }

  return (
    <div
      className="lexical-mermaid-preview"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

function MermaidPreviewList({ blocks }: { blocks: MermaidBlock[] }) {
  if (blocks.length === 0) return null

  return (
    <div className="border-t border-surface-border-soft px-5 py-4">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-brand-primary">
        Mermaid Preview
      </div>
      <div className="space-y-3">
        {blocks.map((block, index) => (
          <MermaidPreview key={`${block.id}-${index}`} block={block} index={index} />
        ))}
      </div>
    </div>
  )
}

export function LexicalEditor({
  initialState,
  onChange,
  placeholder = '내용을 입력하세요...',
  minHeight = '200px',
  readOnly = false,
  toolbarVariant = 'full',
}: LexicalEditorProps) {
  const [mermaidBlocks, setMermaidBlocks] = useState(() =>
    extractMermaidBlocks(initialState),
  )

  const handleChange = useCallback(
    (editorState: EditorState) => {
      const serialized = JSON.stringify(editorState.toJSON())
      setMermaidBlocks(extractMermaidBlocks(serialized))
      onChange(serialized)
    },
    [onChange],
  )

  useEffect(() => {
    setMermaidBlocks(extractMermaidBlocks(initialState))
  }, [initialState])

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
      <div className={`flex flex-col bg-surface-raised ${readOnly ? 'lexical-editor-readonly' : ''}`}>
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
        <MermaidPreviewList blocks={mermaidBlocks} />
      </div>
    </LexicalComposer>
  )
}
