import type { PromptTemplate, AIModuleType, AIContextInput, AISettings } from './types.js';

function metric(value: number | null): string {
  return value === null ? 'Unavailable from provider' : value.toLocaleString();
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'content-generator',
    module: 'content-generator',
    name: 'Content Generator',
    description: 'Generate social media content for any platform',
    temperature: 0.8,
    maxTokens: 1024,
    systemPrompt: `You are an expert social media content creator. Generate high-engagement content tailored to the specified platform and audience. Use the platform's best practices for format, length, and tone. Include relevant emojis and hashtags where appropriate.`,
    userTemplate: `Create {{platform}} content for the following:

Topic: {{topic}}
Tone: {{tone}}
Goal: {{goal}}
Target Audience: {{audience}}

Brand Voice: {{brandVoice}}
Current Campaign: {{campaign}}

Platform best practices:
- Instagram: Visual-first, 2-3 hashtags, conversational
- LinkedIn: Professional, value-driven, 150-300 words
- X/Twitter: Concise, under 280 characters, trending topics
- TikTok: Short-form, trend-aware, hook in first 3 seconds
- Facebook: Community-focused, 80-120 characters, question-driven

Include:
1. Main caption/post text
2. 3-5 relevant hashtags
3. Best posting time recommendation`,
  },
  {
    id: 'campaign-planner',
    module: 'campaign-planner',
    name: 'Campaign Planner',
    description: 'Plan multi-platform marketing campaigns',
    temperature: 0.75,
    maxTokens: 2048,
    systemPrompt: `You are a senior marketing strategist specializing in multi-platform campaign planning. Create comprehensive, actionable campaign plans that align with business goals and leverage each platform's unique strengths.`,
    userTemplate: `Create a {{duration}} campaign plan:

Campaign Name: {{campaign}}
Primary Goal: {{goal}}
Target Audience: {{audience}}
Budget: {{budget}}
Timeline: {{timeline}}

Connected Platforms: {{platforms}}

Provide:
1. Campaign overview and objectives
2. Platform-specific strategies
3. Content calendar (weekly breakdown)
4. KPI targets and measurement plan
5. Budget allocation recommendations`,
  },
  {
    id: 'competitor-analysis',
    module: 'competitor-analysis',
    name: 'Competitor Analysis',
    description: 'Deep analysis of competitor social media strategies',
    temperature: 0.4,
    maxTokens: 1536,
    systemPrompt: `You are a competitive intelligence analyst. Provide data-driven analysis of competitor social media strategies, identifying strengths, weaknesses, and actionable opportunities.`,
    userTemplate: `Analyze our competitive position:

Our Profile: {{workspace}}
Our Platforms: {{platforms}}
Our Engagement Rate: {{engagement}}%
Our Followers: {{followers}}

Provide:
1. Top 3 competitor strengths to address
2. Content gaps in our strategy
3. Recommended actions with priority (High/Medium/Low)
4. Benchmark comparison table`,
  },
  {
    id: 'audience-insights',
    module: 'audience-insights',
    name: 'Audience Insights',
    description: 'Deep audience demographic and behavioral analysis',
    temperature: 0.4,
    maxTokens: 1024,
    systemPrompt: `You are an audience analytics expert. Analyze audience data to provide actionable demographic and behavioral insights for content optimization.`,
    userTemplate: `Analyze our audience:

Demographics: {{ageGroups}}
Top Countries: {{topCountries}}
Active Hours: {{activeHours}}
Devices: {{devices}}
Engagement Rate: {{engagement}}%
Growth Rate: {{growth}}%

Provide:
1. Top 3 audience persona profiles
2. Best posting times by platform
3. Content preferences by segment
4. Growth opportunities`,
  },
  {
    id: 'hashtag-generator',
    module: 'hashtag-generator',
    name: 'Hashtag Generator',
    description: 'Generate trending and relevant hashtag strategies',
    temperature: 0.7,
    maxTokens: 512,
    systemPrompt: `You are a hashtag strategy expert. Generate optimized hashtag sets that balance reach and relevance for maximum engagement.`,
    userTemplate: `Generate hashtags for:

Topic: {{topic}}
Platform: {{platform}}
Target Audience: {{audience}}
Tone: {{tone}}

Include:
1. 5 broad reach hashtags (100K+ posts)
2. 5 niche hashtags (10K-100K posts)
3. 3 branded hashtags
4. Best hashtag strategy and placement tips`,
  },
  {
    id: 'trend-analysis',
    module: 'trend-analysis',
    name: 'Trend Analysis',
    description: 'Identify and analyze emerging social media trends',
    temperature: 0.6,
    maxTokens: 1024,
    systemPrompt: `You are a trend forecasting analyst. Identify emerging trends in social media and provide actionable recommendations for content strategy adaptation.`,
    userTemplate: `Analyze current trends for {{workspace}}:

Industry: {{industry}}
Platforms: {{platforms}}
Audience: {{audience}}

Provide:
1. Top 3 emerging trends in our industry
2. Predicted impact on engagement (next 30 days)
3. Recommended content pivots
4. Risk assessment for ignoring trends`,
  },
  {
    id: 'growth-forecast',
    module: 'growth-forecast',
    name: 'Growth Forecast',
    description: 'Predict follower growth and engagement trends',
    temperature: 0.3,
    maxTokens: 768,
    systemPrompt: `You are a growth analytics specialist. Predict social media growth trajectories based on historical data and current trends, identifying key drivers and risks.`,
    userTemplate: `Forecast growth for {{workspace}}:

Current Followers: {{followers}}
Growth Rate: {{growth}}%
Engagement Rate: {{engagement}}%
Platforms: {{platforms}}
Time Range: {{timeRange}}

Provide:
1. 30-day follower projection
2. Expected engagement rate range
3. Key growth drivers to optimize
4. Risk factors to monitor`,
  },
  {
    id: 'report-generator',
    module: 'report-generator',
    name: 'Report Generator',
    description: 'Generate comprehensive analytics reports',
    temperature: 0.3,
    maxTokens: 2048,
    systemPrompt: `You are an analytics reporting expert. Generate clear, insightful reports that translate raw data into actionable business intelligence.`,
    userTemplate: `Generate a {{timeRange}} performance report:

Metrics
- Followers: {{followers}} ({{growth}}% change)
- Engagement: {{engagement}}% ({{engagementChange}}% change)
- Reach: {{reach}} ({{reachChange}}% change)

Platform Breakdown: {{platforms}}
Top Posts: {{recentPosts}}

Include:
1. Executive summary
2. Key metrics with change analysis
3. Platform-specific performance
4. Top/bottom performing content
5. Recommendations for next period`,
  },
  {
    id: 'content-calendar',
    module: 'content-calendar',
    name: 'Content Calendar',
    description: 'Plan weekly content schedules across platforms',
    temperature: 0.65,
    maxTokens: 1536,
    systemPrompt: `You are a content scheduling expert. Create optimal content calendars that maximize engagement by posting the right content at the right time on each platform.`,
    userTemplate: `Create a {{duration}} content calendar:

Platforms: {{platforms}}
Primary Goals: {{goal}}
Target Audience: {{audience}}
Campaign: {{campaign}}
Brand Voice: {{brandVoice}}

Provide:
1. Daily posting schedule with optimal times
2. Content themes for each day
3. Platform-specific format recommendations
4. Content mix breakdown (educational/promotional/engagement)
5. Holiday or event-based content opportunities`,
  },
  {
    id: 'brand-voice',
    module: 'brand-voice',
    name: 'Brand Voice',
    description: 'Define and maintain consistent brand voice across platforms',
    temperature: 0.5,
    maxTokens: 1024,
    systemPrompt: `You are a brand voice consultant. Help define and maintain a consistent brand voice that resonates with the target audience while standing out from competitors.`,
    userTemplate: `Define brand voice guidelines for {{workspace}}:

Industry: {{industry}}
Target Audience: {{audience}}
Current Tone: {{tone}}
Platforms: {{platforms}}

Provide:
1. Brand voice pillars (3-5 core attributes)
2. Do/Don't examples for each platform
3. Vocabulary guide (words to use/avoid)
4. Tone adjustments by platform
5. Content templates for common post types`,
  },
];

export function getPromptTemplate(module: AIModuleType): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find((t) => t.module === module);
}

export function getAllTemplates(): PromptTemplate[] {
  return [...PROMPT_TEMPLATES];
}

export function buildSystemPrompt(
  template: PromptTemplate,
  context: AIContextInput,
  settings: AISettings,
): string {
  const parts = [template.systemPrompt];

  parts.push(`\n\nContext:\n- Workspace: ${context.workspace.name} (${context.workspace.plan})`);
  parts.push(`- Platforms: ${context.platforms.map((p) => p.name).join(', ')}`);
  parts.push(`- Time Range: ${context.timeRange}`);
  parts.push(`- Followers: ${metric(context.analytics.followers)}`);
  parts.push(`- Engagement Rate: ${metric(context.analytics.engagement)}`);
  parts.push(`- Reach: ${metric(context.analytics.reach)}`);
  if (context.analytics.unavailable.length > 0) {
    parts.push(`- Provider-unavailable fields: ${context.analytics.unavailable.join(', ')}`);
  }

  if (context.campaign) {
    parts.push(`- Active Campaign: ${context.campaign.name} (${context.campaign.status})`);
  }

  parts.push(`\nSettings:\n- Tone: ${settings.tone}`);
  parts.push(`- Language: ${settings.language}`);
  parts.push(`- Response Length: ${settings.responseLength}`);
  parts.push(`- Output Format: ${settings.outputFormat}`);

  if (context.user.preferences.tone) {
    parts.push(`- Preferred Tone: ${context.user.preferences.tone}`);
  }

  return parts.join('\n');
}

export function buildUserPrompt(template: PromptTemplate, context: AIContextInput, userMessage: string): string {
  const replacements: Record<string, string> = {
    '{{platform}}': context.platforms.map((p) => p.name).join(', '),
    '{{platforms}}': context.platforms.map((p) => `${p.name} (${p.status})`).join(', '),
    '{{workspace}}': context.workspace.name,
    '{{audience}}': context.audience.topCountries.slice(0, 3).join(', '),
    '{{followers}}': metric(context.analytics.followers),
    '{{engagement}}': metric(context.analytics.engagement),
    '{{growth}}': metric(context.analytics.growth),
    '{{reach}}': metric(context.analytics.reach),
    '{{timeRange}}': context.timeRange,
    '{{campaign}}': context.campaign?.name ?? 'N/A',
    '{{tone}}': context.user.preferences.tone ?? 'Professional',
    '{{ageGroups}}': context.audience.ageGroups.map((a) => `${a.group}: ${a.pct}%`).join(', '),
    '{{topCountries}}': context.audience.topCountries.join(', '),
    '{{activeHours}}': context.audience.activeHours.join(', '),
    '{{devices}}': context.audience.topDevices.join(', '),
    '{{recentPosts}}': context.recentPosts.slice(0, 3).map((p) => `[${p.platform}] ${p.content} (${p.engagement})`).join('\n'),
  };

  let prompt = template.userTemplate;
  for (const [key, value] of Object.entries(replacements)) {
    prompt = prompt.replaceAll(key, value);
  }

  return `${prompt}\n\nUser request: ${userMessage}`;
}

export function getContextSummary(context: AIContextInput): string {
  return [
    `Workspace: ${context.workspace.name}`,
    `Platforms: ${context.platforms.map((p) => p.name).join(', ')}`,
    `Followers: ${metric(context.analytics.followers)}`,
    `Engagement: ${metric(context.analytics.engagement)}`,
    `Recent Reports: ${context.reports.length > 0 ? context.reports.map((report) => report.title).join(', ') : 'None'}`,
    `Time Range: ${context.timeRange}`,
  ].join(' | ');
}
