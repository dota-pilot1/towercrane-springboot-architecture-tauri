import { useCallback, useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  type ElementFormatType,
  type LexicalNode,
  type TextFormatType,
} from 'lexical'
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
  $setBlocksType,
} from '@lexical/selection'
import { $createHeadingNode, $createQuoteNode, type HeadingTagType } from '@lexical/rich-text'
import {
  $createListItemNode,
  $createListNode,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list'
import { INSERT_TABLE_COMMAND } from '@lexical/table'
import { $createCodeNode } from '@lexical/code'
import { TOGGLE_LINK_COMMAND } from '@lexical/link'
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Redo,
  Strikethrough,
  Table,
  Underline,
  Undo,
  Video,
  X,
} from 'lucide-react'
import { Button } from '../button'
import { CompactSelect } from '../compact-select'
import { INSERT_IMAGE_COMMAND } from './plugins/image-plugin'
import { INSERT_YOUTUBE_COMMAND } from './plugins/youtube-plugin'
import { extractYouTubeId } from './nodes/youtube-node'

type Props = {
  className?: string
  onImageUpload?: (file: File) => Promise<string>
  variant?: 'full' | 'simple'
}

const FONT_SIZES = ['12px', '13px', '14px', '15px', '16px', '18px', '20px', '24px', '28px', '32px', '40px']
const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: '기본', value: 'inherit' },
  { label: 'Sans Serif', value: 'Arial, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Monospace', value: 'Menlo, Consolas, monospace' },
  { label: 'Pretendard', value: 'Pretendard, sans-serif' },
]

const TEXT_COLORS: { label: string; value: string }[] = [
  { label: '기본', value: 'inherit' },
  { label: '본문', value: 'var(--foreground)' },
  { label: '보조', value: 'var(--muted-foreground)' },
  { label: '브랜드', value: 'var(--primary)' },
  { label: '위험', value: 'var(--destructive)' },
  { label: '파랑', value: '#2563eb' },
  { label: '보라', value: '#9333ea' },
]

const HIGHLIGHT_COLORS: { label: string; value: string }[] = [
  { label: '없음', value: 'transparent' },
  { label: '브랜드', value: 'color-mix(in srgb, var(--primary) 18%, transparent)' },
  { label: '노랑', value: '#fef08a' },
  { label: '분홍', value: '#fbcfe8' },
  { label: '초록', value: '#bbf7d0' },
  { label: '파랑', value: '#bfdbfe' },
  { label: '주황', value: '#fed7aa' },
]

export function LexicalToolbar({ className, onImageUpload, variant = 'full' }: Props) {
  const [editor] = useLexicalComposerContext()
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({})
  const [fontSize, setFontSize] = useState<string>('15px')
  const [fontFamily, setFontFamily] = useState<string>('inherit')

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      setActiveFormats({
        bold: selection.hasFormat('bold'),
        italic: selection.hasFormat('italic'),
        underline: selection.hasFormat('underline'),
        strikethrough: selection.hasFormat('strikethrough'),
        code: selection.hasFormat('code'),
      })
      setFontSize($getSelectionStyleValueForProperty(selection, 'font-size', '15px'))
      setFontFamily($getSelectionStyleValueForProperty(selection, 'font-family', 'inherit'))
    }
  }, [])

  const applyStyle = useCallback(
    (styles: Record<string, string>) => {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, styles)
        }
      })
    },
    [editor],
  )

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        editor.getEditorState().read(updateToolbar)
        return false
      },
      1,
    )
  }, [editor, updateToolbar])

  useEffect(() => {
    return editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setCanUndo(payload)
        return false
      },
      1,
    )
  }, [editor])

  useEffect(() => {
    return editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setCanRedo(payload)
        return false
      },
      1,
    )
  }, [editor])

  const format = (type: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, type)
  }

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode())
      }
    })
  }

  const formatHeading = (tag: HeadingTagType) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(tag))
      }
    })
  }

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode())
      }
    })
  }

  const formatCodeBlock = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createCodeNode())
      }
    })
  }

  const align = (alignment: ElementFormatType) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment)
  }

  if (variant === 'simple') {
    return (
      <div
        className={`flex flex-wrap items-center gap-1 border-b border-surface-border-soft bg-surface-muted px-3 py-2 ${className ?? ''}`}
      >
        <ToolbarButton onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} disabled={!canUndo} title="실행 취소">
          <Undo className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} disabled={!canRedo} title="다시 실행">
          <Redo className="size-3.5" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton onClick={formatParagraph} title="본문">
          <span className="px-1 text-[11px] font-semibold">P</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => formatHeading('h1')} title="Heading 1">
          <Heading1 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => formatHeading('h2')} title="Heading 2">
          <Heading2 className="size-3.5" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton onClick={() => format('bold')} active={activeFormats.bold} title="Bold (⌘B)">
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => format('italic')} active={activeFormats.italic} title="Italic (⌘I)">
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => format('underline')} active={activeFormats.underline} title="Underline (⌘U)">
          <Underline className="size-3.5" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)} title="Bulleted list">
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)} title="Numbered list">
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={formatQuote} title="인용">
          <Quote className="size-3.5" />
        </ToolbarButton>
        <LinkInsertButton />
      </div>
    )
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-1 border-b border-surface-border-soft bg-surface-muted px-3 py-2 ${className ?? ''}`}
    >
      <ToolbarButton onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} disabled={!canUndo} title="실행 취소">
        <Undo className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} disabled={!canRedo} title="다시 실행">
        <Redo className="size-3.5" />
      </ToolbarButton>

      <Divider />

      <FontFamilySelect value={fontFamily} onChange={(value) => applyStyle({ 'font-family': value })} />
      <FontSizeSelect value={fontSize} onChange={(value) => applyStyle({ 'font-size': value })} />

      <Divider />

      <ToolbarButton onClick={() => format('bold')} active={activeFormats.bold} title="Bold (⌘B)">
        <Bold className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => format('italic')} active={activeFormats.italic} title="Italic (⌘I)">
        <Italic className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => format('underline')} active={activeFormats.underline} title="Underline (⌘U)">
        <Underline className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => format('strikethrough')} active={activeFormats.strikethrough} title="Strikethrough">
        <Strikethrough className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => format('code')} active={activeFormats.code} title="Inline code">
        <Code className="size-3.5" />
      </ToolbarButton>
      <ColorPicker
        icon={<Baseline className="size-3.5" />}
        title="글씨 색상"
        colors={TEXT_COLORS}
        onPick={(color) => applyStyle({ color })}
      />
      <ColorPicker
        icon={<Highlighter className="size-3.5" />}
        title="형광펜"
        colors={HIGHLIGHT_COLORS}
        onPick={(color) => applyStyle({ 'background-color': color })}
      />

      <Divider />

      <ToolbarButton onClick={formatParagraph} title="본문">
        <span className="px-1 text-[11px] font-semibold">P</span>
      </ToolbarButton>
      <ToolbarButton onClick={() => formatHeading('h1')} title="Heading 1">
        <Heading1 className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => formatHeading('h2')} title="Heading 2">
        <Heading2 className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => formatHeading('h3')} title="Heading 3">
        <Heading3 className="size-3.5" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)} title="Bulleted list">
        <List className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)} title="Numbered list">
        <ListOrdered className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)} title="체크리스트">
        <ListChecks className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={formatQuote} title="인용">
        <Quote className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={formatCodeBlock} title="Code block">
        <span className="px-1 font-mono text-[10px] font-semibold">{'{ }'}</span>
      </ToolbarButton>
      <MarkdownInsertButton />

      <Divider />

      <ToolbarButton onClick={() => align('left')} title="왼쪽 정렬">
        <AlignLeft className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => align('center')} title="가운데 정렬">
        <AlignCenter className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => align('right')} title="오른쪽 정렬">
        <AlignRight className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => align('justify')} title="양쪽 정렬">
        <AlignJustify className="size-3.5" />
      </ToolbarButton>

      <Divider />

      <LinkInsertButton />
      <ToolbarButton onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)} title="수평선 삽입">
        <Minus className="size-3.5" />
      </ToolbarButton>
      <TableInsertButton />

      {onImageUpload ? (
        <>
          <Divider />
          <ImageInsertButton onUpload={onImageUpload} />
        </>
      ) : null}

      <YoutubeInsertButton />
    </div>
  )
}

function MarkdownInsertButton() {
  const [editor] = useLexicalComposerContext()
  const [open, setOpen] = useState(false)
  const [markdown, setMarkdown] = useState('')

  const handleInsert = () => {
    const content = markdown.trim()
    if (!content) return

    editor.focus()
    editor.update(() => {
      const nodes = createMarkdownNodes(content)
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        selection.insertNodes(nodes)
      } else {
        $getRoot().append(...nodes)
      }
    })
    setMarkdown('')
    setOpen(false)
  }

  return (
    <>
      <ToolbarButton onClick={() => setOpen(true)} title="Markdown 삽입">
        <span className="font-mono text-[10px] font-bold">MD</span>
      </ToolbarButton>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[240] ui-overlay" />
          <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-[241] flex w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-surface-border-soft shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-surface-border-soft px-5 py-4">
              <div className="min-w-0">
                <Dialog.Title className="text-base font-semibold text-text-primary">
                  Markdown 삽입
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-xs text-text-muted">
                  붙여넣은 Markdown을 Lexical 블록으로 변환해서 현재 커서 위치에 넣습니다.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary"
                  aria-label="닫기"
                >
                  <X className="size-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="p-5">
              <textarea
                value={markdown}
                onChange={(event) => setMarkdown(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    event.preventDefault()
                    handleInsert()
                  }
                }}
                autoFocus
                spellCheck={false}
                className="ui-input min-h-[340px] w-full resize-y rounded-md border px-4 py-3 font-mono text-xs leading-6 outline-none"
                placeholder={[
                  '## Sql 문제 정답',
                  '',
                  '```sql',
                  'SELECT *',
                  'FROM users;',
                  '```',
                  '',
                  '## Sql 주요 문법 설명',
                  '',
                  '- SELECT는 조회할 컬럼을 지정합니다.',
                ].join('\n')}
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-surface-border-soft bg-surface-muted/60 px-5 py-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 min-w-16 px-4"
                onClick={() => setOpen(false)}
              >
                취소
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9 min-w-20 px-4"
                disabled={!markdown.trim()}
                onClick={handleInsert}
              >
                삽입
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

function createMarkdownNodes(markdown: string): LexicalNode[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const nodes: LexicalNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    const codeStart = trimmed.match(/^```(\w+)?/)
    if (codeStart) {
      const language = codeStart[1]
      const codeLines: string[] = []
      index += 1

      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index])
        index += 1
      }
      if (index < lines.length) index += 1

      const codeNode = $createCodeNode(language)
      codeNode.append($createTextNode(codeLines.join('\n')))
      nodes.push(codeNode)
      continue
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      const level = heading[1].length
      const headingNode = $createHeadingNode(`h${level}` as 'h1' | 'h2' | 'h3')
      appendInlineMarkdown(headingNode, heading[2])
      nodes.push(headingNode)
      index += 1
      continue
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      const list = $createListNode('bullet')
      while (index < lines.length && /^[-*+]\s+/.test(lines[index].trim())) {
        const item = $createListItemNode()
        appendInlineMarkdown(item, lines[index].trim().replace(/^[-*+]\s+/, ''))
        list.append(item)
        index += 1
      }
      nodes.push(list)
      continue
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const list = $createListNode('number')
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        const item = $createListItemNode()
        appendInlineMarkdown(item, lines[index].trim().replace(/^\d+\.\s+/, ''))
        list.append(item)
        index += 1
      }
      nodes.push(list)
      continue
    }

    const paragraphLines = [trimmed]
    index += 1
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^```/.test(lines[index].trim()) &&
      !/^(#{1,3})\s+/.test(lines[index].trim()) &&
      !/^[-*+]\s+/.test(lines[index].trim()) &&
      !/^\d+\.\s+/.test(lines[index].trim())
    ) {
      paragraphLines.push(lines[index].trim())
      index += 1
    }

    const paragraph = $createParagraphNode()
    appendInlineMarkdown(paragraph, paragraphLines.join(' '))
    nodes.push(paragraph)
  }

  return nodes
}

function appendInlineMarkdown(
  node: ReturnType<typeof $createParagraphNode> | ReturnType<typeof $createHeadingNode> | ReturnType<typeof $createListItemNode>,
  text: string,
) {
  const pattern = /(\*\*[^*]+?\*\*|`[^`]+?`)/g
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      node.append($createTextNode(text.slice(cursor, match.index)))
    }

    const token = match[0]
    const textNode = $createTextNode(token.slice(token.startsWith('**') ? 2 : 1, token.endsWith('**') ? -2 : -1))
    if (token.startsWith('**')) {
      textNode.toggleFormat('bold')
    } else {
      textNode.toggleFormat('code')
    }
    node.append(textNode)
    cursor = match.index + token.length
  }

  if (cursor < text.length) {
    node.append($createTextNode(text.slice(cursor)))
  }
}

function LinkInsertButton() {
  const [editor] = useLexicalComposerContext()

  const handleClick = () => {
    const url = window.prompt('링크 URL을 입력하세요 (빈 값으로 제거)')
    if (url === null) return
    const trimmed = url.trim()
    if (!trimmed) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
      return
    }
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, normalized)
  }

  return (
    <ToolbarButton onClick={handleClick} title="링크 삽입/제거">
      <LinkIcon className="size-3.5" />
    </ToolbarButton>
  )
}

function YoutubeInsertButton() {
  const [editor] = useLexicalComposerContext()

  const handleClick = () => {
    const url = window.prompt('YouTube URL을 입력하세요')
    if (!url) return
    const videoId = extractYouTubeId(url)
    if (!videoId) {
      alert('유효한 YouTube URL이 아닙니다.')
      return
    }
    editor.dispatchCommand(INSERT_YOUTUBE_COMMAND, { videoId })
  }

  return (
    <ToolbarButton onClick={handleClick} title="YouTube 영상 삽입">
      <Video className="size-3.5" />
    </ToolbarButton>
  )
}

function ImageInsertButton({ onUpload }: { onUpload: (file: File) => Promise<string> }) {
  const [editor] = useLexicalComposerContext()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) {
      alert('이미지 크기는 10MB 이하만 업로드 가능합니다.')
      return
    }

    try {
      const url = await onUpload(file)
      editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
        src: url,
        altText: file.name,
      })
    } catch (err) {
      console.error('Image upload failed:', err)
      alert('이미지 업로드에 실패했습니다.')
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <>
      <ToolbarButton onClick={() => fileInputRef.current?.click()} title="이미지 삽입">
        <ImageIcon className="size-3.5" />
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </>
  )
}

function ColorPicker({
  icon,
  title,
  colors,
  onPick,
}: {
  icon: React.ReactNode
  title: string
  colors: { label: string; value: string }[]
  onPick: (color: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <ToolbarButton onClick={() => setOpen((value) => !value)} active={open} title={title}>
        {icon}
      </ToolbarButton>
      {open ? (
        <div className="absolute left-0 top-full z-20 mt-1 flex items-center gap-1 rounded-md border border-surface-border bg-surface-raised px-2 py-1.5 shadow-md">
          {colors.map((color) => (
            <button
              key={color.value}
              type="button"
              title={color.label}
              onClick={() => {
                onPick(color.value)
                setOpen(false)
              }}
              className="size-5 rounded border border-surface-border transition-transform hover:scale-110"
              style={{
                backgroundColor: color.value,
                backgroundImage:
                  color.value === 'inherit' || color.value === 'transparent'
                    ? 'linear-gradient(to bottom right, transparent calc(50% - 0.5px), var(--destructive) calc(50% - 0.5px), var(--destructive) calc(50% + 0.5px), transparent calc(50% + 0.5px))'
                    : undefined,
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function FontSizeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const current = FONT_SIZES.includes(value) ? value : '15px'
  return (
    <CompactSelect
      value={current}
      onChange={(event) => onChange(event.target.value)}
      title="글씨 크기"
      wrapperClassName="w-[68px]"
      className="h-8 min-h-8 [height:32px] [min-height:32px] pl-2.5 pr-7 text-xs font-semibold"
    >
      {FONT_SIZES.map((size) => (
        <option key={size} value={size}>
          {size.replace('px', '')}
        </option>
      ))}
    </CompactSelect>
  )
}

function FontFamilySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const match = FONT_FAMILIES.find((font) => font.value === value)
  return (
    <CompactSelect
      value={match ? match.value : 'inherit'}
      onChange={(event) => onChange(event.target.value)}
      title="글씨체"
      wrapperClassName="w-[100px]"
      className="h-8 min-h-8 [height:32px] [min-height:32px] pl-2.5 pr-7 text-xs font-semibold"
    >
      {FONT_FAMILIES.map((font) => (
        <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
          {font.label}
        </option>
      ))}
    </CompactSelect>
  )
}

const TABLE_COLS = 6
const TABLE_ROWS = 6

function TableInsertButton() {
  const [editor] = useLexicalComposerContext()
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const insert = (rows: number, columns: number) => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, { rows: String(rows), columns: String(columns) })
    setOpen(false)
    setHovered(null)
  }

  return (
    <div ref={ref} className="relative">
      <ToolbarButton onClick={() => setOpen((value) => !value)} active={open} title="표 삽입">
        <Table className="size-3.5" />
      </ToolbarButton>
      {open ? (
        <div className="absolute left-0 top-full z-20 mt-1 rounded-md border border-surface-border bg-surface-raised p-2 shadow-md">
          <p className="mb-1.5 text-center text-[11px] text-text-muted">
            {hovered ? `${hovered.row} x ${hovered.col}` : '행 x 열 선택'}
          </p>
          <div className="flex flex-col gap-0.5">
            {Array.from({ length: TABLE_ROWS }, (_, rowIndex) => (
              <div key={rowIndex} className="flex gap-0.5">
                {Array.from({ length: TABLE_COLS }, (_, colIndex) => {
                  const active =
                    hovered && rowIndex < hovered.row && colIndex < hovered.col
                  return (
                    <button
                      key={colIndex}
                      type="button"
                      className={`size-5 rounded-sm border transition-colors ${
                        active
                          ? 'border-brand-border bg-brand-glass'
                          : 'border-surface-border bg-surface-strong hover:border-brand-border hover:bg-brand-glass'
                      }`}
                      onMouseEnter={() => setHovered({ row: rowIndex + 1, col: colIndex + 1 })}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => insert(rowIndex + 1, colIndex + 1)}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ToolbarButton({
  children,
  onClick,
  active,
  disabled,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex size-8 items-center justify-center rounded-md transition-colors ${
        active
          ? 'bg-brand-glass text-brand-primary'
          : 'text-text-secondary hover:bg-surface-strong hover:text-text-primary'
      } disabled:pointer-events-none disabled:opacity-30`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-1.5 h-6 w-px bg-surface-border-soft" />
}
