import { createSignal, onMount, type Component } from 'solid-js';
import { createHighlighter } from 'shiki';
import mermaid from 'mermaid';
import {
  Button,
  useNotification,
  type Message,
  type Attachment,
  ChatContainer,
  configureSyncHighlighter,
  configureSyncMermaid,
} from '@floegence/floe-webapp-core';

// Demo messages showcasing ALL block types with rich content
const createDemoMessages = (): Message[] => [
  // === Conversation 1: Welcome and Introduction ===
  {
    id: 'msg-welcome',
    role: 'assistant',
    blocks: [
      {
        type: 'markdown',
        content: `## Welcome to the Chat Component Demo 👋

This demo showcases **all message block types** supported by the chat component. Scroll through to see different content types rendered with proper styling.

### Supported Block Types
- Text & Markdown
- Code blocks with syntax highlighting
- Code diffs with unified/split view
- Mermaid diagrams
- Shell command output
- Checklists
- Tool calls
- Thinking indicators
- File attachments`,
      },
    ],
    status: 'complete',
    timestamp: Date.now() - 600000,
  },

  // === Conversation 2: Code Examples ===
  {
    id: 'msg-user-code',
    role: 'user',
    blocks: [{ type: 'text', content: 'Show me some code examples with syntax highlighting.' }],
    status: 'complete',
    timestamp: Date.now() - 500000,
  },
  {
    id: 'msg-code-examples',
    role: 'assistant',
    blocks: [
      {
        type: 'thinking',
        content: 'Analyzing the request for code examples... Preparing TypeScript and Python samples...',
        duration: 1200,
      },
      { type: 'text', content: 'Here are examples in different languages with full syntax highlighting:' },
      {
        type: 'code',
        language: 'typescript',
        filename: 'api/users.ts',
        content: `interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: Date;
}

async function fetchUsers(filter?: Partial<User>): Promise<User[]> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filter }),
  });

  if (!response.ok) {
    throw new Error(\`Failed to fetch users: \${response.status}\`);
  }

  return response.json();
}

// Usage example
const admins = await fetchUsers({ role: 'admin' });
console.log(\`Found \${admins.length} admin users\`);`,
      },
      { type: 'text', content: 'And here\'s a Python example with async/await:' },
      {
        type: 'code',
        language: 'python',
        filename: 'data_processor.py',
        content: `import asyncio
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class DataPoint:
    timestamp: float
    value: float
    label: Optional[str] = None

async def process_batch(data: List[DataPoint]) -> dict:
    """Process a batch of data points asynchronously."""
    results = {
        'count': len(data),
        'sum': sum(d.value for d in data),
        'avg': sum(d.value for d in data) / len(data) if data else 0,
    }

    # Simulate async processing
    await asyncio.sleep(0.1)

    return results

# Run the processor
async def main():
    data = [DataPoint(i, i * 2.5) for i in range(100)]
    result = await process_batch(data)
    print(f"Processed {result['count']} points, avg: {result['avg']:.2f}")

asyncio.run(main())`,
      },
    ],
    status: 'complete',
    timestamp: Date.now() - 490000,
  },

  // === Conversation 3: Code Diff ===
  {
    id: 'msg-user-diff',
    role: 'user',
    blocks: [{ type: 'text', content: 'Can you show me the changes you made to the configuration file?' }],
    status: 'complete',
    timestamp: Date.now() - 400000,
  },
  {
    id: 'msg-diff-example',
    role: 'assistant',
    blocks: [
      { type: 'text', content: 'I\'ve updated the configuration with better defaults and added new features. Here\'s the diff:' },
      {
        type: 'code-diff',
        language: 'typescript',
        filename: 'config/app.config.ts',
        oldCode: `export const config = {
  apiUrl: 'http://localhost:3000',
  timeout: 5000,
  retries: 3,
  debug: false,
};`,
        newCode: `export const config = {
  apiUrl: process.env.API_URL ?? 'http://localhost:3000',
  timeout: 15000,
  retries: 5,
  debug: process.env.NODE_ENV === 'development',
  cache: {
    enabled: true,
    ttl: 3600,
    maxSize: 1000,
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000,
  },
};`,
      },
      {
        type: 'markdown',
        content: `**Key changes:**
- Environment variable support for \`apiUrl\`
- Increased timeout from 5s to 15s
- Added caching configuration
- Added rate limiting settings
- Debug mode based on environment`,
      },
    ],
    status: 'complete',
    timestamp: Date.now() - 390000,
  },

  // === Conversation 4: Shell Commands ===
  {
    id: 'msg-user-shell',
    role: 'user',
    blocks: [{ type: 'text', content: 'Run some shell commands to check the project status.' }],
    status: 'complete',
    timestamp: Date.now() - 300000,
  },
  {
    id: 'msg-shell-example',
    role: 'assistant',
    blocks: [
      { type: 'text', content: 'I\'ll run a few commands to check the project status:' },
      {
        type: 'shell',
        command: 'git status --short',
        output: ` M src/components/Chat.tsx
 M src/styles/chat.css
?? src/utils/helpers.ts
?? tests/chat.test.ts`,
        exitCode: 0,
        status: 'success',
      },
      {
        type: 'shell',
        command: 'npm run test -- --coverage',
        output: `PASS  tests/chat.test.ts
PASS  tests/utils.test.ts

Test Suites: 2 passed, 2 total
Tests:       15 passed, 15 total
Snapshots:   0 total
Time:        2.345 s

Coverage: 87.5% statements, 82.3% branches`,
        exitCode: 0,
        status: 'success',
      },
      {
        type: 'shell',
        command: 'npm run build',
        output: `error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

  src/utils/helpers.ts:23:15
    23   calculateSum("invalid")
                      ~~~~~~~~~`,
        exitCode: 1,
        status: 'error',
      },
      {
        type: 'markdown',
        content: `⚠️ **Build failed** - There's a type error in \`helpers.ts\`. The \`calculateSum\` function expects a number but received a string.`,
      },
    ],
    status: 'complete',
    timestamp: Date.now() - 290000,
  },

  // === Conversation 5: Mermaid Diagrams ===
  {
    id: 'msg-user-diagram',
    role: 'user',
    blocks: [{ type: 'text', content: 'Can you create a system architecture diagram?' }],
    status: 'complete',
    timestamp: Date.now() - 200000,
  },
  {
    id: 'msg-diagram-example',
    role: 'assistant',
    blocks: [
      { type: 'text', content: 'Here\'s a comprehensive system architecture diagram:' },
      {
        type: 'mermaid',
        content: `flowchart TB
    subgraph Client["Client Layer"]
        WEB[Web App]
        MOB[Mobile App]
        CLI[CLI Tool]
    end

    subgraph Gateway["API Gateway"]
        LB[Load Balancer]
        AUTH[Auth Service]
        RATE[Rate Limiter]
    end

    subgraph Services["Microservices"]
        USER[User Service]
        DATA[Data Service]
        NOTIFY[Notification Service]
    end

    subgraph Storage["Data Layer"]
        DB[(PostgreSQL)]
        CACHE[(Redis)]
        S3[(S3 Storage)]
    end

    WEB & MOB & CLI --> LB
    LB --> AUTH --> RATE
    RATE --> USER & DATA & NOTIFY
    USER --> DB & CACHE
    DATA --> DB & S3
    NOTIFY --> CACHE`,
      },
      { type: 'text', content: 'And here\'s the user authentication flow:' },
      {
        type: 'mermaid',
        content: `sequenceDiagram
    actor User
    participant App
    participant Auth
    participant DB

    User->>App: Login Request
    App->>Auth: Validate Credentials
    Auth->>DB: Check User
    DB-->>Auth: User Data

    alt Valid Credentials
        Auth->>Auth: Generate JWT
        Auth-->>App: Token + Refresh Token
        App-->>User: Login Success
    else Invalid Credentials
        Auth-->>App: 401 Unauthorized
        App-->>User: Login Failed
    end`,
      },
    ],
    status: 'complete',
    timestamp: Date.now() - 190000,
  },

  // === Conversation 6: Tool Calls ===
  {
    id: 'msg-user-search',
    role: 'user',
    blocks: [{ type: 'text', content: 'Search for files containing "authentication" in the codebase.' }],
    status: 'complete',
    timestamp: Date.now() - 100000,
  },
  {
    id: 'msg-tool-example',
    role: 'assistant',
    blocks: [
      {
        type: 'tool-call',
        toolName: 'search_files',
        toolId: 'search-1',
        args: { pattern: 'authentication', directory: 'src', fileType: '*.ts' },
        status: 'success',
        result: {
          matches: [
            { file: 'src/auth/authentication.ts', line: 15, content: 'export class AuthenticationService' },
            { file: 'src/middleware/auth.ts', line: 8, content: 'async function validateAuthentication' },
            { file: 'src/utils/jwt.ts', line: 22, content: '// Authentication token helper' },
          ],
          totalMatches: 3,
        },
        collapsed: false,
      },
      {
        type: 'tool-call',
        toolName: 'read_file',
        toolId: 'read-1',
        args: { path: 'src/auth/authentication.ts', lines: '1-30' },
        status: 'success',
        result: {
          content: 'File content loaded successfully',
          lineCount: 30,
        },
        collapsed: true,
      },
      {
        type: 'markdown',
        content: `Found **3 files** containing "authentication":

1. \`src/auth/authentication.ts\` - Main authentication service
2. \`src/middleware/auth.ts\` - Authentication middleware
3. \`src/utils/jwt.ts\` - JWT token utilities`,
      },
    ],
    status: 'complete',
    timestamp: Date.now() - 90000,
  },

  // === Conversation 7: Checklist ===
  {
    id: 'msg-user-tasks',
    role: 'user',
    blocks: [{ type: 'text', content: 'What\'s the status of the project tasks?' }],
    status: 'complete',
    timestamp: Date.now() - 50000,
  },
  {
    id: 'msg-checklist-example',
    role: 'assistant',
    blocks: [
      { type: 'text', content: 'Here\'s the current project progress:' },
      {
        type: 'checklist',
        items: [
          { id: 'task-1', text: 'Set up project structure and dependencies', checked: true },
          { id: 'task-2', text: 'Implement core authentication flow', checked: true },
          { id: 'task-3', text: 'Create database schema and migrations', checked: true },
          { id: 'task-4', text: 'Build REST API endpoints', checked: true },
          { id: 'task-5', text: 'Add input validation and error handling', checked: true },
          { id: 'task-6', text: 'Write unit tests (87% coverage)', checked: false },
          { id: 'task-7', text: 'Set up CI/CD pipeline', checked: false },
          { id: 'task-8', text: 'Performance optimization', checked: false },
          { id: 'task-9', text: 'Security audit and penetration testing', checked: false },
          { id: 'task-10', text: 'Production deployment', checked: false },
        ],
      },
      {
        type: 'markdown',
        content: `**Progress: 5/10 tasks completed (50%)**

🟢 Phase 1 (Setup) - Complete
🟢 Phase 2 (Core Development) - Complete
🟡 Phase 3 (Testing) - In Progress
⚪ Phase 4 (Deployment) - Not Started`,
      },
    ],
    status: 'complete',
    timestamp: Date.now() - 40000,
  },

  // === Conversation 8: Rich Markdown ===
  {
    id: 'msg-user-summary',
    role: 'user',
    blocks: [{ type: 'text', content: 'Give me a summary of the API documentation.' }],
    status: 'complete',
    timestamp: Date.now() - 20000,
  },
  {
    id: 'msg-markdown-rich',
    role: 'assistant',
    blocks: [
      {
        type: 'markdown',
        content: `# API Documentation Summary

## Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| \`/auth/login\` | POST | User login with credentials |
| \`/auth/register\` | POST | New user registration |
| \`/auth/refresh\` | POST | Refresh access token |
| \`/auth/logout\` | POST | Invalidate session |

## Response Codes

- **200** - Success
- **201** - Created
- **400** - Bad Request
- **401** - Unauthorized
- **403** - Forbidden
- **404** - Not Found
- **500** - Internal Server Error

## Rate Limits

> ⚠️ **Note:** API requests are rate-limited to **100 requests per minute** per API key.

### Example Request

\`\`\`bash
curl -X POST https://api.example.com/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@example.com", "password": "***"}'
\`\`\`

### Example Response

\`\`\`json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJl...",
    "expiresIn": 3600
  }
}
\`\`\``,
      },
    ],
    status: 'complete',
    timestamp: Date.now() - 10000,
  },
];

export interface ChatPageProps {
  class?: string;
}

export const ChatPage: Component<ChatPageProps> = (props) => {
  const notifications = useNotification();
  const [demoMessages, setDemoMessages] = createSignal<Message[]>([]);
  const [isReady, setIsReady] = createSignal(false);

  // Initialize renderers BEFORE loading messages
  onMount(async () => {
    // Initialize Mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
    });

    configureSyncMermaid({
      render: async (id: string, content: string) => {
        try {
          const { svg } = await mermaid.render(id, content);
          return { svg };
        } catch (error) {
          console.error('Mermaid render error:', error);
          return {
            svg: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" viewBox="0 0 400 100">
              <rect width="100%" height="100%" fill="var(--muted)" rx="8"/>
              <text x="50%" y="50%" text-anchor="middle" fill="var(--error)" font-size="12">
                Failed to render diagram
              </text>
            </svg>`,
          };
        }
      },
    });

    // Initialize Shiki highlighter
    try {
      const highlighter = await createHighlighter({
        themes: ['github-dark', 'github-light'],
        langs: ['typescript', 'javascript', 'tsx', 'jsx', 'python', 'json', 'html', 'css', 'bash', 'text', 'shell'],
      });

      configureSyncHighlighter({
        codeToHtml: (code: string, options: { lang: string; theme: string }) => {
          try {
            const loadedLangs = highlighter.getLoadedLanguages();
            const lang = loadedLangs.includes(options.lang as never) ? options.lang : 'text';
            return highlighter.codeToHtml(code, {
              lang,
              theme: options.theme || 'github-dark',
            });
          } catch {
            const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<pre class="shiki"><code>${escaped}</code></pre>`;
          }
        },
      });
    } catch (error) {
      console.error('Failed to initialize Shiki:', error);
      configureSyncHighlighter({
        codeToHtml: (code: string) => {
          const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          return `<pre class="shiki"><code>${escaped}</code></pre>`;
        },
      });
    }

    // Now load messages after renderers are ready
    setDemoMessages(createDemoMessages());
    setIsReady(true);
  });

  const handleSendMessage = async (_content: string, attachments: Attachment[], addMessage: (msg: Message) => void) => {
    // Simulate AI response
    await new Promise((r) => setTimeout(r, 800));

    addMessage({
      id: `msg-${Date.now()}`,
      role: 'assistant',
      blocks: [
        {
          type: 'markdown',
          content: `Thanks for your message! This is a demo response.

The chat component supports:
- **Real-time streaming** responses
- **Multiple block types** in a single message
- **Tool call** visualization
- **Code highlighting** with Shiki
- **Mermaid diagrams** rendering`,
        },
      ],
      status: 'complete',
      timestamp: Date.now(),
    });

    if (attachments.length > 0) {
      notifications.info('Attachments', `Received ${attachments.length} file(s)`);
    }
  };

  const handleLoadMore = async (): Promise<Message[]> => {
    await new Promise((r) => setTimeout(r, 500));
    notifications.info('History', 'No more messages to load');
    return [];
  };

  const clearMessages = () => {
    setDemoMessages([]);
    notifications.info('Cleared', 'All messages removed');
  };

  const resetDemo = () => {
    setDemoMessages(createDemoMessages());
    notifications.info('Reset', 'Demo messages restored');
  };

  return (
    <div class={`h-full flex flex-col ${props.class ?? ''}`}>
      {/* Header */}
      <div class="flex-shrink-0 px-4 py-3 border-b border-border bg-background">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-base font-semibold">Chat Component Demo</h1>
            <p class="text-[11px] text-muted-foreground mt-0.5">
              Showcasing all message block types with rich styling
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={clearMessages}>
              Clear
            </Button>
            <Button size="sm" variant="outline" onClick={resetDemo}>
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div class="flex-1 min-h-0">
        {isReady() ? (
          <ChatContainer
            initialMessages={demoMessages()}
            config={{
              placeholder: 'Type a message...',
              allowAttachments: true,
              maxAttachments: 5,
              virtualList: { overscan: 10 },
            }}
            callbacks={{
              onSendMessage: handleSendMessage,
              onLoadMore: handleLoadMore,
            }}
            showHeader={false}
          />
        ) : (
          <div class="flex items-center justify-center h-full">
            <div class="text-muted-foreground text-sm">Loading...</div>
          </div>
        )}
      </div>
    </div>
  );
};
