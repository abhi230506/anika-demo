"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"

export function MemorySettings({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [memoryEnabled, setMemoryEnabled] = useState(true)
  const [emotionalAwarenessEnabled, setEmotionalAwarenessEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [memoryCount, setMemoryCount] = useState(0)

  // Load current memory state
  useEffect(() => {
    if (open) {
      loadMemoryState()
    }
  }, [open])

  const loadMemoryState = async () => {
    try {
      const response = await fetch('/api/memory')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setMemoryEnabled(data.data.memory_enabled ?? true)
          setMemoryCount(data.data.slots?.length ?? 0)
        }
      }
      
      // Load emotional awareness from localStorage (client-side preference)
      const emotionalAwareness = localStorage.getItem('emotional_awareness_enabled')
      if (emotionalAwareness !== null) {
        setEmotionalAwarenessEnabled(emotionalAwareness === 'true')
      }
    } catch (error) {
      console.error('Failed to load memory state:', error)
    }
  }

  const handleToggleMemory = async (enabled: boolean) => {
    setLoading(true)
    try {
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setMemoryEnabled(enabled)
          await loadMemoryState()
        }
      }
    } catch (error) {
      console.error('Failed to update memory setting:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleEmotionalAwareness = (enabled: boolean) => {
    setEmotionalAwarenessEnabled(enabled)
    localStorage.setItem('emotional_awareness_enabled', enabled.toString())
  }

  const handleClearMemories = async () => {
    if (!confirm('Are you sure you want to clear all memories? This cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/memory/clear', {
        method: 'POST',
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setMemoryCount(0)
          alert('All memories have been cleared.')
        }
      }
    } catch (error) {
      console.error('Failed to clear memories:', error)
      alert('Failed to clear memories.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-[#6AF0FF] text-[#E6E6E6]">
        <DialogHeader>
          <DialogTitle className="text-[#6AF0FF]">Memory Settings</DialogTitle>
          <DialogDescription className="text-[#9AA0A6]">
            Control how the AI remembers your conversations
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-[#E6E6E6]">
                Memory Mode
              </label>
              <p className="text-xs text-[#9AA0A6]">
                {memoryEnabled 
                  ? "The AI will remember facts and events from your conversations"
                  : "The AI will not save or recall past conversations"}
              </p>
            </div>
            <Switch
              checked={memoryEnabled}
              onCheckedChange={handleToggleMemory}
              disabled={loading}
              className="data-[state=checked]:bg-[#6AF0FF]"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#9AA0A6]/20">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-[#E6E6E6]">
                Emotional Awareness
              </label>
              <p className="text-xs text-[#9AA0A6]">
                {emotionalAwarenessEnabled 
                  ? "The AI will detect and respond to your emotional state"
                  : "The AI will not adjust tone based on emotions"}
              </p>
            </div>
            <Switch
              checked={emotionalAwarenessEnabled}
              onCheckedChange={handleToggleEmotionalAwareness}
              disabled={loading}
              className="data-[state=checked]:bg-[#6AF0FF]"
            />
          </div>

          {memoryEnabled && (
            <div className="pt-2 border-t border-[#9AA0A6]/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-[#E6E6E6]">
                    Stored Memories
                  </p>
                  <p className="text-xs text-[#9AA0A6]">
                    {memoryCount} fact{memoryCount !== 1 ? 's' : ''} stored
                  </p>
                </div>
              </div>
              
              <Button
                onClick={handleClearMemories}
                disabled={loading || memoryCount === 0}
                className="w-full bg-[#FF5A5A] hover:bg-[#FF4444] text-white"
                variant="destructive"
              >
                Clear All Memories
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

