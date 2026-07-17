import { ProjectRepository } from './project.repository';
import { IProject } from '../../types';
import { BadRequestError, NotFoundError } from '../../utils/errors';

const projectRepo = new ProjectRepository();

export class ProjectService {
  async getProject(id: string, userId: string): Promise<IProject> {
    const project = await projectRepo.findById(id);
    if (!project) throw new NotFoundError('Project not found.');
    if (project.userId !== userId) throw new BadRequestError('You do not own this project.');
    return project;
  }

  async listUserProjects(userId: string): Promise<IProject[]> {
    return projectRepo.listByUserId(userId);
  }

  async listAllProjects(): Promise<IProject[]> {
    return projectRepo.listAll();
  }

  async createProject(name: string, description: string | undefined, userId: string): Promise<IProject> {
    const id = `prj-${Math.random().toString(36).substr(2, 9)}`;
    return projectRepo.create({
      id,
      name,
      description,
      userId,
    });
  }

  async updateProject(id: string, name: string | undefined, description: string | undefined, userId: string): Promise<IProject> {
    const project = await this.getProject(id, userId);
    const updated = await projectRepo.update(id, {
      ...(name && { name }),
      ...(description !== undefined && { description }),
    });
    if (!updated) throw new NotFoundError('Failed to update project.');
    return updated;
  }

  async deleteProject(id: string, userId: string): Promise<boolean> {
    await this.getProject(id, userId);
    return projectRepo.delete(id);
  }
}
