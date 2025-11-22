import api from './api';
import { Team, TeamRole } from '../types';

export const teamService = {
  async getAll(): Promise<Team[]> {
    const response = await api.get<Team[]>('/teams');
    return response.data;
  },

  async getOne(id: string): Promise<Team> {
    const response = await api.get<Team>(`/teams/${id}`);
    return response.data;
  },

  async create(name: string, description?: string): Promise<Team> {
    const response = await api.post<Team>('/teams', { name, description });
    return response.data;
  },

  async addMember(teamId: string, userId: string, role?: TeamRole) {
    const response = await api.post(`/teams/${teamId}/members`, {
      userId,
      role,
    });
    return response.data;
  },

  async removeMember(teamId: string, userId: string) {
    const response = await api.delete(`/teams/${teamId}/members/${userId}`);
    return response.data;
  },
};
