import { ProjectConfig, ReplyMode } from '@ai-zhaoshang/shared';

export interface UpsertProjectInput {
  id: string;
  name: string;
  replyMode?: ReplyMode;
  autoSendEnabled?: boolean;
  handoffEnabled?: boolean;
  enabled?: boolean;
}

export interface ProjectStore {
  upsertProject(input: UpsertProjectInput): Promise<ProjectConfig>;
  getProject(projectId: string): Promise<ProjectConfig | undefined>;
  listProjects(): Promise<ProjectConfig[]>;
}

export class MemoryProjectStore implements ProjectStore {
  private projects = new Map<string, ProjectConfig>();

  async upsertProject(input: UpsertProjectInput): Promise<ProjectConfig> {
    const current = this.projects.get(input.id);
    const now = new Date().toISOString();
    const project: ProjectConfig = {
      id: input.id,
      name: input.name,
      replyMode: input.replyMode || current?.replyMode || 'readonly',
      autoSendEnabled: input.autoSendEnabled ?? current?.autoSendEnabled ?? false,
      handoffEnabled: input.handoffEnabled ?? current?.handoffEnabled ?? true,
      enabled: input.enabled ?? current?.enabled ?? true,
      createdAt: current?.createdAt || now,
      updatedAt: now,
    };
    this.projects.set(project.id, project);
    return project;
  }

  async getProject(projectId: string): Promise<ProjectConfig | undefined> {
    return this.projects.get(projectId);
  }

  async listProjects(): Promise<ProjectConfig[]> {
    return [...this.projects.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }
}

export function defaultProjectConfig(projectId: string): ProjectConfig {
  const now = new Date().toISOString();
  return {
    id: projectId,
    name: projectId,
    replyMode: parseReplyMode(process.env.REPLY_MODE),
    autoSendEnabled: process.env.REPLY_MODE === 'auto',
    handoffEnabled: true,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

function parseReplyMode(value: string | undefined): ReplyMode {
  return value === 'assisted' || value === 'auto' ? value : 'readonly';
}
