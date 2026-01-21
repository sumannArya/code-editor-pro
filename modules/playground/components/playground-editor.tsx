"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import Editor, { type Monaco } from "@monaco-editor/react"
import { TemplateFile } from "../lib/path-to-json"
import { configureMonaco, defaultEditorOptions, getEditorLanguage } from "../lib/editor-config"
import * as Y from "yjs"
import { WebsocketProvider } from "y-websocket"
import { MonacoBinding } from "y-monaco"

/* =========================
   Types
========================= */

interface PlaygroundEditorProps {
  activeFile: (TemplateFile & { id: string }) | undefined
  content: string
  onContentChange: (value: string) => void

  suggestion: string | null
  suggestionLoading: boolean
  suggestionPosition: { line: number; column: number } | null

  onAcceptSuggestion: (editor: any, monaco: any) => void
  onRejectSuggestion: (editor: any) => void
  onTriggerSuggestion: (type: string, editor: any) => void

  playgroundId: string
  currentUser: { name?: string | null; color?: string }
}

/* =========================
   Utils
========================= */

const getRandomColor = () => {
  const colors = [
    "#f783ac",
    "#a29bfe",
    "#55efc4",
    "#81ecec",
    "#74b9ff",
    "#fab1a0",
    "#ffeaa7",
    "#e17055",
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

/* =========================
   Component
========================= */

export const PlaygroundEditor = ({
  activeFile,
  content,
  onContentChange,
  suggestion,
  suggestionLoading,
  suggestionPosition,
  onAcceptSuggestion,
  onRejectSuggestion,
  onTriggerSuggestion,
  playgroundId,
  currentUser,
}: PlaygroundEditorProps) => {
  const [status, setStatus] = useState<"connected" | "connecting" | "disconnected">("connecting")

  const editorRef = useRef<any>(null)
  const monacoRef = useRef<Monaco | null>(null)

  const docRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<WebsocketProvider | null>(null)
  const bindingRef = useRef<MonacoBinding | null>(null)

  const userColorRef = useRef<string>(currentUser.color || getRandomColor())

  /* =========================
     Monaco Mount
  ========================= */

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    configureMonaco(monaco)

    editor.updateOptions({
      ...defaultEditorOptions,
      inlineSuggest: { enabled: true },
      cursorSmoothCaretAnimation: "on",
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      onTriggerSuggestion("completion", editor)
    })

    updateEditorLanguage()
  }

  const updateEditorLanguage = () => {
    if (!activeFile || !monacoRef.current || !editorRef.current) return
    const model = editorRef.current.getModel()
    if (!model) return

    monacoRef.current.editor.setModelLanguage(
      model,
      getEditorLanguage(activeFile.fileExtension || ""),
    )
  }

  useEffect(() => {
    updateEditorLanguage()
  }, [activeFile?.fileExtension])

  /* =========================
     YJS: Doc + Provider (ONCE)
  ========================= */

  useEffect(() => {
    if (!playgroundId) return

    const doc = new Y.Doc()
    const provider = new WebsocketProvider(
      "wss://demos.yjs.dev", // replace with your own server later
      `code-editor-pro-${playgroundId}`,
      doc,
    )

    provider.on("status", (event: any) => {
      setStatus(event.status)
    })

    provider.awareness.setLocalStateField("user", {
      name: currentUser.name || "Anonymous",
      color: userColorRef.current,
    })

    docRef.current = doc
    providerRef.current = provider

    return () => {
      provider.disconnect()
      doc.destroy()
    }
  }, [playgroundId, currentUser.name])

  /* =========================
     YJS â†” Monaco Binding (per file)
  ========================= */

  useEffect(() => {
    if (!activeFile || !editorRef.current || !docRef.current || !providerRef.current) return

    // cleanup previous binding
    bindingRef.current?.destroy()
    bindingRef.current = null

    const doc = docRef.current
    const provider = providerRef.current
    const editor = editorRef.current
    const model = editor.getModel()

    if (!model) return

    const ytext = doc.getText(activeFile.id)

    const initContent = () => {
      if (ytext.toString() === "" && content) {
        doc.transact(() => {
          ytext.insert(0, content)
        })
      }
    }

    provider.synced ? initContent() : provider.once("sync", initContent)

    bindingRef.current = new MonacoBinding(
      ytext,
      model,
      new Set([editor]),
      provider.awareness,
    )

    return () => {
      bindingRef.current?.destroy()
      provider.off("sync", initContent)
    }
  }, [activeFile?.id])

  /* =========================
     YJS â†’ React State Sync
     (THIS FIXES REALTIME)
  ========================= */

  useEffect(() => {
    if (!docRef.current || !activeFile) return

    const ytext = docRef.current.getText(activeFile.id)

    const handleUpdate = () => {
      onContentChange(ytext.toString())
    }

    ytext.observe(handleUpdate)

    return () => {
      ytext.unobserve(handleUpdate)
    }
  }, [activeFile?.id])

  /* =========================
     Render
  ========================= */

  return (
    <div className="h-full relative">
      {/* Status */}
      <div className="absolute bottom-2 right-2 z-10 px-2 py-1 rounded text-xs bg-background/80 backdrop-blur border shadow-sm flex items-center gap-1">
        <div
          className={`w-2 h-2 rounded-full ${status === "connected"
            ? "bg-green-500"
            : status === "connecting"
              ? "bg-yellow-500 animate-pulse"
              : "bg-red-500"
            }`}
        />
        <span className="capitalize text-muted-foreground">{status}</span>
      </div>

      <Editor
        height="100%"
        path={activeFile?.id}
        defaultValue={content}
        onMount={handleEditorDidMount}
        language={
          activeFile ? getEditorLanguage(activeFile.fileExtension || "") : "plaintext"
        }
        options={defaultEditorOptions as any}
      />
    </div>
  )
}

