/**
 * Test file to verify Recharts and @dnd-kit installation
 * This file demonstrates basic usage of both libraries
 * Can be deleted after verification
 */

// ============================================
// RECHARTS EXAMPLE - Simple Line Chart
// ============================================

import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const data = [
  { name: 'Page A', uv: 4000, pv: 2400, amt: 2400 },
  { name: 'Page B', uv: 3000, pv: 1398, amt: 2210 },
  { name: 'Page C', uv: 2000, pv: 9800, amt: 2290 },
  { name: 'Page D', uv: 2780, pv: 3908, amt: 2000 },
  { name: 'Page E', uv: 1890, pv: 4800, amt: 2181 },
  { name: 'Page F', uv: 2390, pv: 3800, amt: 2500 },
  { name: 'Page G', uv: 3490, pv: 4300, amt: 2100 },
]

export function SimpleLineChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="pv" stroke="#8884d8" activeDot={{ r: 8 }} />
        <Line type="monotone" dataKey="uv" stroke="#82ca9d" />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ============================================
// @DND-KIT EXAMPLE - Sortable List
// ============================================

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'

// Sortable Item Component
function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-4 mb-2 bg-white border border-gray-300 rounded cursor-move hover:shadow-md"
    >
      {children}
    </div>
  )
}

// Main Sortable List Component
export function SortableList() {
  const [items, setItems] = useState([
    { id: '1', content: 'Drag me around! 🎯' },
    { id: '2', content: 'I am sortable! 📦' },
    { id: '3', content: 'Reorder this list! 🔄' },
    { id: '4', content: 'Accessibility included! ♿' },
    { id: '5', content: 'Keyboard navigation works! ⌨️' },
  ])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map(item => item.id)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((item) => (
          <SortableItem key={item.id} id={item.id}>
            {item.content}
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  )
}

// ============================================
// COMBINED DEMO COMPONENT
// ============================================

export default function LibraryTestPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Library Installation Test</h1>

      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">📊 Recharts - Line Chart Example</h2>
        <div className="bg-white p-6 rounded-lg shadow">
          <SimpleLineChart />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">🎯 @dnd-kit - Sortable List Example</h2>
        <div className="bg-gray-50 p-6 rounded-lg shadow">
          <p className="mb-4 text-gray-600">
            Try dragging items to reorder them. Keyboard navigation also works!
          </p>
          <SortableList />
        </div>
      </div>
    </div>
  )
}