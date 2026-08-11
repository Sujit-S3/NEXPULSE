import { expect, test } from '@playwright/test';
import { json, mockProductApi, success } from './support/mocks';

const connection = {
  id: 'connection-e2e',
  workspaceId: 'workspace-e2e',
  provider: 'instagram',
  providerAccountId: 'ig-1',
  providerUserId: 'ig-user-1',
  displayName: 'NEXPULSE Studio',
  username: 'nexpulse.studio',
  accountType: 'business',
  selectedAccount: true,
  isPrimary: true,
  status: 'connected',
  scopes: [],
};

test.describe('AI chat', () => {
  test('shows the account-selection empty state when no platform is connected', async ({ page }) => {
    await mockProductApi(page, { authenticated: true });
    await page.goto('/ai');

    await expect(page.getByRole('heading', { name: 'Choose an account to begin.' })).toBeVisible();
  });

  test('shows a setup banner when no AI provider is configured', async ({ page }) => {
    await mockProductApi(page, { authenticated: true });
    await page.route('http://localhost:4000/api/v1/platforms/connections', (route) => json(route, success([connection])));
    await page.goto('/ai');

    await expect(page.getByText('AI provider setup required')).toBeVisible();
  });

  test('sending a message renders the streamed assistant response', async ({ page }) => {
    await mockProductApi(page, { authenticated: true });
    await page.route('http://localhost:4000/api/v1/platforms/connections', (route) => json(route, success([connection])));
    await page.route('http://localhost:4000/api/v1/ai/status', (route) => json(route, success({
      enabled: true,
      ready: true,
      defaultModel: 'gpt-4o',
      models: [{ id: 'gpt-4o', provider: 'OpenAI', label: 'GPT-4o', configured: true }],
    })));
    let conversationCreated = false;
    await page.route('http://localhost:4000/api/v1/ai/conversations', async (route) => {
      if (route.request().method() === 'POST') {
        conversationCreated = true;
        return json(route, success({ id: 'conversation-e2e', model: 'gpt-4o', title: 'New conversation' }), 201);
      }
      if (!conversationCreated) return json(route, success({ conversations: [], total: 0 }));
      // Once the turn completes, the app invalidates and refetches this list expecting
      // the just-created conversation back with both messages persisted.
      return json(route, success({
        conversations: [{
          id: 'conversation-e2e',
          model: 'gpt-4o',
          title: 'New conversation',
          messages: [
            { id: 'msg-user-1', role: 'user', content: 'How is engagement trending?', timestamp: new Date().toISOString() },
            { id: 'msg-assistant-1', role: 'assistant', content: 'The engagement rate is trending upward.', timestamp: new Date().toISOString() },
          ],
        }],
        total: 1,
      }));
    });
    await page.route('http://localhost:4000/api/v1/ai/stream', async (route) => {
      const body = [
        'data: {"type":"chunk","content":"The engagement rate "}',
        '',
        'data: {"type":"chunk","content":"is trending upward."}',
        '',
        'data: {"type":"done","usage":{"tokens":42,"latency":120},"citations":[],"followUps":[]}',
        '',
        'data: [DONE]',
        '',
      ].join('\n');
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body });
    });

    await page.goto('/ai');
    await expect(page.getByRole('heading', { name: 'Ask a sharper question.' })).toBeVisible();

    await page.getByPlaceholder('Ask anything about this account…').fill('How is engagement trending?');
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText('The engagement rate is trending upward.')).toBeVisible();
  });
});
