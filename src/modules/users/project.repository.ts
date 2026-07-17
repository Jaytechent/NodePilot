import { IProject } from '../../types';
import { ProjectModel } from './project.model';
import { getIsMongooseConnected } from '../../db/connection';
import { logger } from '../../utils/logger';

const inMemoryProjects = new Map<string, IProject>();

export class ProjectRepository {
  async findById(id: string): Promise<IProject | null> {
    if (getIsMongooseConnected()) {
      try {
        const project = await ProjectModel.findById(id).exec();
        return project ? (project.toJSON() as IProject) : null;
      } catch (err: any) {
        logger.error(`ProjectRepository findById error: ${err.message}`);
      }
    }
    return inMemoryProjects.get(id) || null;
  }

  async listByUserId(userId: string): Promise<IProject[]> {
    if (getIsMongooseConnected()) {
      try {
        const projects = await ProjectModel.find({ userId }).exec();
        return projects.map((p) => p.toJSON() as IProject);
      } catch (err: any) {
        logger.error(`ProjectRepository listByUserId error: ${err.message}`);
      }
    }
    const projects: IProject[] = [];
    for (const project of inMemoryProjects.values()) {
      if (project.userId === userId) {
        projects.push(project);
      }
    }
    return projects;
  }

  async listAll(): Promise<IProject[]> {
    if (getIsMongooseConnected()) {
      try {
        const projects = await ProjectModel.find().exec();
        return projects.map((p) => p.toJSON() as IProject);
      } catch (err: any) {
        logger.error(`ProjectRepository listAll error: ${err.message}`);
      }
    }
    return Array.from(inMemoryProjects.values());
  }

  async create(project: Omit<IProject, 'createdAt' | 'updatedAt'>): Promise<IProject> {
    const now = new Date();
    const newProject: IProject = {
      ...project,
      createdAt: now,
      updatedAt: now,
    };

    if (getIsMongooseConnected()) {
      try {
        const projectDoc = new ProjectModel({
          _id: newProject.id,
          name: newProject.name,
          description: newProject.description,
          userId: newProject.userId,
        });
        await projectDoc.save();
        return projectDoc.toJSON() as IProject;
      } catch (err: any) {
        logger.error(`ProjectRepository create error: ${err.message}. Saving to memory.`);
      }
    }

    inMemoryProjects.set(newProject.id, newProject);
    return newProject;
  }

  async update(id: string, updates: Partial<Omit<IProject, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<IProject | null> {
    if (getIsMongooseConnected()) {
      try {
        const project = await ProjectModel.findByIdAndUpdate(
          id,
          { $set: updates },
          { new: true }
        ).exec();
        return project ? (project.toJSON() as IProject) : null;
      } catch (err: any) {
        logger.error(`ProjectRepository update error: ${err.message}`);
      }
    }

    const project = inMemoryProjects.get(id);
    if (!project) return null;

    const updatedProject: IProject = {
      ...project,
      ...updates,
      updatedAt: new Date(),
    };
    inMemoryProjects.set(id, updatedProject);
    return updatedProject;
  }

  async delete(id: string): Promise<boolean> {
    if (getIsMongooseConnected()) {
      try {
        const res = await ProjectModel.deleteOne({ _id: id }).exec();
        return (res.deletedCount ?? 0) > 0;
      } catch (err: any) {
        logger.error(`ProjectRepository delete error: ${err.message}`);
      }
    }
    return inMemoryProjects.delete(id);
  }
}
