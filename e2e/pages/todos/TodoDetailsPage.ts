import { expect, type Locator, type Page } from '@playwright/test';

import { ChecklistPanel } from './ChecklistPanel';
import { CommentsPanel } from '../comments/CommentsPanel';
import type { TodoPriority, TodoState } from '../../data/todos';

const priorityLabels: Record<TodoPriority, RegExp> = {
  Low: /low|низк/i,
  Medium: /medium|средн/i,
  High: /high|высок/i,
  Super: /super|супер/i,
};

const stateLabels: Record<TodoState, RegExp> = {
  In_work: /in work|в работе/i,
  Planning: /planning|план/i,
  Finished: /finished|законч/i,
  Canceled: /canceled|отмен/i,
};

export class TodoDetailsPage {
  readonly checklist: ChecklistPanel;
  readonly comments: CommentsPanel;
  readonly body: Locator;
  readonly main: Locator;
  readonly contentInput: Locator;

  constructor(private readonly page: Page) {
    this.checklist = new ChecklistPanel(page);
    this.comments = new CommentsPanel(page);
    this.body = page.locator('body');
    this.main = page.locator('main');
    this.contentInput = page.locator('textarea').first();
  }

  async open(todoId: string): Promise<void> {
    await this.page.goto(`/todos/${todoId}`);
  }

  async expectTitleVisible(title: string): Promise<void> {
    await expect(this.body).toContainText(title);
  }

  async expectContentVisible(content: string): Promise<void> {
    await expect(this.contentInput).toHaveValue(content);
  }

  async expectLikeCount(count: number): Promise<void> {
    await expect(this.page.getByRole('button', { name: /like|лайк/i }).filter({ hasText: String(count) })).toBeVisible();
  }

  async expectPriority(priority: TodoPriority): Promise<void> {
    await expect(this.main.getByRole('button', { name: priorityLabels[priority] })).toBeVisible();
  }

  async expectState(state: TodoState): Promise<void> {
    await expect(this.main.getByRole('button', { name: stateLabels[state] })).toBeVisible();
  }

  async expectChecklistAreaVisible(): Promise<void> {
    await expect(this.page.locator('[data-marker="checklist-card"]')).toBeVisible();
  }

  async like(): Promise<void> {
    await this.page.getByRole('button', { name: /like|unlike|лайк|нрав/i }).first().click();
  }

  async editTitle(nextTitle: string): Promise<void> {
    await this.page.getByRole('heading').first().dblclick();
    await this.page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await this.page.keyboard.type(nextTitle);
    await this.page.keyboard.press('Enter');
    await expect(this.page.getByRole('heading', { name: nextTitle })).toBeVisible();
  }

  async editContent(nextContent: string): Promise<void> {
    await this.contentInput.fill(nextContent);
    await this.contentInput.blur();
    await expect(this.contentInput).toHaveValue(nextContent);
  }

  async selectPriority(priority: TodoPriority): Promise<void> {
    await this.main.getByRole('button', { name: /low|medium|high|super|низк|средн|высок|супер/i }).click();
    await expect(this.page.getByText(/change priority|изменить приоритет/i)).toBeVisible();
    await this.page.getByRole('button', { name: priorityLabels[priority] }).click();
    await this.expectPriority(priority);
  }

  async selectState(state: TodoState): Promise<void> {
    await this.main.getByRole('button', { name: /in work|planning|finished|canceled|работ|план|законч|отмен/i }).click();
    await expect(this.page.getByText(/change state|изменить статус/i)).toBeVisible();
    await this.page.getByRole('button', { name: stateLabels[state] }).click();
    await this.expectState(state);
  }
}
