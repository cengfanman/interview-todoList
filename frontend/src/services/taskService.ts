import api from './api';
import { Task, TaskHistory, FilterTasksDto } from '../types';

export const taskService = {
  async getAll(filters?: FilterTasksDto): Promise<Task[]> {
    const response = await api.get<Task[]>('/tasks', { params: filters });
    return response.data;
  },

  async getOne(id: string): Promise<Task> {
    const response = await api.get<Task>(`/tasks/${id}`);
    return response.data;
  },

  async create(data: any): Promise<Task> {
    const response = await api.post<Task>('/tasks', data);
    return response.data;
  },

  async update(id: string, data: any): Promise<Task> {
    const response = await api.patch<Task>(`/tasks/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },

  async addFollowers(taskId: string, userIds: string[]) {
    const response = await api.post(`/tasks/${taskId}/followers`, { userIds });
    return response.data;
  },

  async removeFollower(taskId: string, userId: string) {
    const response = await api.delete(`/tasks/${taskId}/followers/${userId}`);
    return response.data;
  },

  async getHistory(taskId: string): Promise<TaskHistory[]> {
    const response = await api.get<TaskHistory[]>(`/tasks/${taskId}/history`);
    return response.data;
  },

  async addComment(taskId: string, comment: string): Promise<TaskHistory[]> {
    const response = await api.post<TaskHistory[]>(`/tasks/${taskId}/comments`, {
      comment,
    });
    return response.data;
  },
};
