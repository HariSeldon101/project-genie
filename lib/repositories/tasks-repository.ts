/**
 * Tasks Repository - Handles all tasks table database operations
 *
 * Technical PM Note: This centralizes task management operations.
 * No other file should directly query the tasks table.
 */

import { BaseRepository } from './base-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { Database } from '@/lib/database.types'

type Task = Database['public']['Tables']['tasks']['Row']
type TaskInsert = Database['public']['Tables']['tasks']['Insert']
type TaskUpdate = Database['public']['Tables']['tasks']['Update']

export class TasksRepository extends BaseRepository {
  private static instance: TasksRepository

  static getInstance(): TasksRepository {
    if (!this.instance) {
      this.instance = new TasksRepository()
    }
    return this.instance
  }

  /**
   * Get all tasks for a project
   */
  async getProjectTasks(projectId: string): Promise<Task[]> {
    const timer = permanentLogger.timing('repository.getProjectTasks')

    return this.execute('getProjectTasks', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching project tasks', {
        projectId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        permanentLogger.captureError('TASKS_REPOSITORY', error as Error, {
          operation: 'getProjectTasks',
          projectId
        })
        throw error
      }

      timer.stop()
      return data || []
    })
  }

  /**
   * Get a single task
   */
  async getTask(taskId: string): Promise<Task | null> {
    const timer = permanentLogger.timing('repository.getTask')

    return this.execute('getTask', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching task', {
        taskId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .maybeSingle()

      if (error) {
        permanentLogger.captureError('TASKS_REPOSITORY', error as Error, {
          operation: 'getTask',
          taskId
        })
        throw error
      }

      timer.stop()
      return data
    })
  }

  /**
   * Create a new task
   */
  async createTask(task: Omit<TaskInsert, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    const timer = permanentLogger.timing('repository.createTask')

    return this.execute('createTask', async (client) => {
      permanentLogger.breadcrumb('repository', 'Creating task', {
        projectId: task.project_id,
        title: task.title,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('tasks')
        .insert(task)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('TASKS_REPOSITORY', error as Error, {
          operation: 'createTask',
          task
        })
        throw error
      }

      if (!data) {
        throw new Error('Failed to create task - no data returned')
      }

      timer.stop()
      return data
    })
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, updates: TaskUpdate): Promise<Task> {
    const timer = permanentLogger.timing('repository.updateTask')

    return this.execute('updateTask', async (client) => {
      permanentLogger.breadcrumb('repository', 'Updating task', {
        taskId,
        updates,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('TASKS_REPOSITORY', error as Error, {
          operation: 'updateTask',
          taskId,
          updates
        })
        throw error
      }

      if (!data) {
        throw new Error('Failed to update task - no data returned')
      }

      timer.stop()
      return data
    })
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<void> {
    const timer = permanentLogger.timing('repository.deleteTask')

    return this.execute('deleteTask', async (client) => {
      permanentLogger.breadcrumb('repository', 'Deleting task', {
        taskId,
        timestamp: Date.now()
      })

      const { error } = await client
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) {
        permanentLogger.captureError('TASKS_REPOSITORY', error as Error, {
          operation: 'deleteTask',
          taskId
        })
        throw error
      }

      timer.stop()
    })
  }
}