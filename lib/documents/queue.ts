/**
 * Document Generation Queue System
 * Manages document generation tasks with retry logic and priority handling
 */

import { GeneratedDocument } from '../llm/types'

export interface QueueTask {
  id: string
  projectId: string
  documentType: string
  priority: 'high' | 'normal' | 'low'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  retries: number
  maxRetries: number
  generator: () => Promise<GeneratedDocument>
  result?: GeneratedDocument
  error?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}

export class DocumentQueue {
  private queue: QueueTask[] = []
  private processing = false
  private maxConcurrent = 1 // Sequential by default for DeepSeek
  private currentTasks = 0
  private listeners: ((task: QueueTask) => void)[] = []

  constructor(private options: {
    maxConcurrent?: number
    maxRetries?: number
    onTaskComplete?: (task: QueueTask) => void
    onTaskFailed?: (task: QueueTask) => void
  } = {}) {
    this.maxConcurrent = options.maxConcurrent || 1
  }

  /**
   * Add a document generation task to the queue
   */
  async addTask(
    projectId: string,
    documentType: string,
    generator: () => Promise<GeneratedDocument>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<string> {
    const task: QueueTask = {
      id: `task-${Date.now()}-${Math.random()}`,
      projectId,
      documentType,
      priority,
      status: 'pending',
      retries: 0,
      maxRetries: this.options.maxRetries || 3,
      generator,
      createdAt: new Date()
    }

    // Insert based on priority
    if (priority === 'high') {
      // Add after other high priority tasks
      const lastHighIndex = this.queue.findIndex(t => t.priority !== 'high')
      if (lastHighIndex === -1) {
        this.queue.push(task)
      } else {
        this.queue.splice(lastHighIndex, 0, task)
      }
    } else if (priority === 'low') {
      this.queue.push(task)
    } else {
      // Normal priority - add after high priority
      const firstLowIndex = this.queue.findIndex(t => t.priority === 'low')
      if (firstLowIndex === -1) {
        this.queue.push(task)
      } else {
        this.queue.splice(firstLowIndex, 0, task)
      }
    }

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue()
    }

    return task.id
  }

  /**
   * Process tasks in the queue
   */
  private async processQueue() {
    if (this.processing && this.currentTasks >= this.maxConcurrent) {
      return
    }

    this.processing = true

    while (this.queue.length > 0 && this.currentTasks < this.maxConcurrent) {
      const task = this.queue.find(t => t.status === 'pending')
      if (!task) break

      this.currentTasks++
      this.processTask(task).finally(() => {
        this.currentTasks--
        if (this.queue.some(t => t.status === 'pending')) {
          this.processQueue()
        } else if (this.currentTasks === 0) {
          this.processing = false
        }
      })
    }
  }

  /**
   * Process a single task with retry logic
   */
  private async processTask(task: QueueTask) {
    task.status = 'processing'
    task.startedAt = new Date()
    this.notifyListeners(task)

    try {
      console.log(`📋 Processing ${task.documentType} for project ${task.projectId}`)
      const result = await task.generator()
      
      task.status = 'completed'
      task.result = result
      task.completedAt = new Date()
      
      console.log(`✅ Completed ${task.documentType} in ${this.getTaskDuration(task)}s`)
      
      if (this.options.onTaskComplete) {
        this.options.onTaskComplete(task)
      }
      
      this.notifyListeners(task)
      this.removeTask(task)
      
    } catch (error: any) {
      task.retries++
      task.error = error.message
      
      if (task.retries < task.maxRetries) {
        console.warn(`⚠️ ${task.documentType} failed (attempt ${task.retries}/${task.maxRetries}): ${error.message}`)
        task.status = 'pending' // Reset to pending for retry
        
        // Add exponential backoff
        const backoffMs = Math.min(1000 * Math.pow(2, task.retries), 30000)
        console.log(`⏳ Retrying ${task.documentType} in ${backoffMs/1000}s...`)
        
        setTimeout(() => {
          this.processQueue()
        }, backoffMs)
        
      } else {
        task.status = 'failed'
        task.completedAt = new Date()
        
        console.error(`❌ ${task.documentType} failed after ${task.maxRetries} attempts`)
        
        if (this.options.onTaskFailed) {
          this.options.onTaskFailed(task)
        }
        
        this.notifyListeners(task)
        this.removeTask(task)
      }
    }
  }

  /**
   * Get task duration in seconds
   */
  private getTaskDuration(task: QueueTask): number {
    if (!task.startedAt || !task.completedAt) return 0
    return Math.round((task.completedAt.getTime() - task.startedAt.getTime()) / 1000)
  }

  /**
   * Remove completed/failed task from queue
   */
  private removeTask(task: QueueTask) {
    const index = this.queue.findIndex(t => t.id === task.id)
    if (index > -1) {
      this.queue.splice(index, 1)
    }
  }

  /**
   * Get current queue status
   */
  getStatus(): {
    pending: number
    processing: number
    completed: number
    failed: number
    total: number
  } {
    const tasks = this.getAllTasks()
    return {
      pending: tasks.filter(t => t.status === 'pending').length,
      processing: tasks.filter(t => t.status === 'processing').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      total: tasks.length
    }
  }

  /**
   * Get all tasks (including completed)
   */
  getAllTasks(): QueueTask[] {
    return [...this.queue]
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): QueueTask | undefined {
    return this.queue.find(t => t.id === taskId)
  }

  /**
   * Subscribe to task updates
   */
  onTaskUpdate(listener: (task: QueueTask) => void) {
    this.listeners.push(listener)
  }

  /**
   * Notify listeners of task updates
   */
  private notifyListeners(task: QueueTask) {
    this.listeners.forEach(listener => listener(task))
  }

  /**
   * Clear all pending tasks
   */
  clearPending() {
    this.queue = this.queue.filter(t => t.status !== 'pending')
  }

  /**
   * Stop processing (gracefully)
   */
  stop() {
    this.processing = false
  }
}