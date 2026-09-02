import { getBrandDomain } from "../connectors-registry";
import { type ConnectorCategory } from "../connectors-catalog";

export type PluginCategory =
  | "Discover"
  | "Installed"
  | "My Plugins"
  | ConnectorCategory;

export interface PluginCapability {
  name: string;
  description: string;
}

export interface Plugin {
  id: string;
  name: string;
  description: string;
  category: ConnectorCategory;
  tone: string;
  domain?: string;
  provider: string;
  permissions?: string[];
  capabilities?: PluginCapability[];
  ready?: boolean;
  isNew?: boolean;
  popular?: boolean;
}

export const PLUGIN_CATEGORIES: ConnectorCategory[] = [
  "Popular",
  "New",
  "Creative",
  "Communication",
  "Data & Analytics",
  "Developer",
  "Finance",
  "Health",
  "Operations",
  "Productivity",
  "Sales & Marketing",
];

export const PLUGINS: Plugin[] = [
  {
    id: "google-drive",
    name: "Google Drive",
    provider: "Google",
    description: "Access and search your Google Drive files directly.",
    category: "Productivity",
    tone: "bg-emerald-500/10 text-emerald-400",
    domain: "google.com",
    ready: true,
    popular: true,
    permissions: ["Read files", "Search drive"],
    capabilities: [
      { name: "File Search", description: "Search for documents in your Google Drive." },
      { name: "File Retrieval", description: "Download and read content from specific files." }
    ]
  },
  {
    id: "gmail-calendar",
    name: "Gmail & Calendar",
    provider: "Google",
    description: "Manage your emails and calendar events.",
    category: "Communication",
    tone: "bg-red-500/10 text-red-400",
    domain: "gmail.com",
    ready: true,
    popular: true,
    permissions: ["Read emails", "Search mailbox", "Manage calendar"],
    capabilities: [
      { name: "Email Search", description: "Search and summarize recent emails." },
      { name: "Schedule Meetings", description: "Check availability and create calendar events." }
    ]
  },
  {
    id: "github",
    name: "GitHub",
    provider: "GitHub",
    description: "Browse repositories and manage issues/PRs.",
    category: "Developer",
    tone: "bg-white/5 text-white",
    domain: "github.com",
    ready: true,
    popular: true,
    permissions: ["Repository access", "User profile", "Code search"],
    capabilities: [
      { name: "Read Repositories", description: "Browse and read files from your repositories." },
      { name: "Manage Issues", description: "Create, search, and review issues." },
      { name: "PR Review", description: "Summarize and review pull requests." }
    ]
  },
  {
    id: "notion",
    name: "Notion",
    provider: "Notion",
    description: "Search and read pages from your Notion workspace.",
    category: "Productivity",
    tone: "bg-white/5 text-white",
    domain: "notion.so",
    ready: true,
    popular: true,
    permissions: ["Read pages", "Search workspace"],
    capabilities: [
      { name: "Workspace Search", description: "Search for any page in your Notion workspace." },
      { name: "Page Reading", description: "Retrieve content from Notion blocks and pages." }
    ]
  },
  {
    id: "slack",
    name: "Slack",
    provider: "Slack",
    description: "Send and receive messages in Slack channels.",
    category: "Communication",
    tone: "bg-purple-500/10 text-purple-400",
    domain: "slack.com",
    ready: true,
    permissions: ["Read channels", "Send messages"],
    capabilities: [
      { name: "Channel Search", description: "Find messages and history in Slack channels." },
      { name: "Instant Messaging", description: "Post updates or replies to channels." }
    ]
  },
  {
    id: "figma",
    name: "Figma",
    provider: "Figma",
    description: "Access and inspect Figma designs and files.",
    category: "Creative",
    tone: "bg-rose-500/10 text-rose-400",
    domain: "figma.com",
    ready: false,
    permissions: ["File access", "User profile"],
    capabilities: [
      { name: "File Inspection", description: "Get metadata and layer information from designs." }
    ]
  },
  {
    id: "discord",
    name: "Discord",
    provider: "Discord",
    description: "Communicate with your Discord communities.",
    category: "Communication",
    tone: "bg-indigo-500/10 text-indigo-400",
    domain: "discord.com",
    ready: true,
    permissions: ["Read messages", "Send replies"]
  },
  {
    id: "vercel",
    name: "Vercel",
    provider: "Vercel",
    description: "Monitor and manage your Vercel deployments.",
    category: "Developer",
    tone: "bg-white/5 text-white",
    domain: "vercel.com",
    ready: true,
    permissions: ["Manage deployments", "Read logs"]
  },
  {
    id: "sentry",
    name: "Sentry",
    provider: "Sentry",
    description: "Track and summarize application errors.",
    category: "Developer",
    tone: "bg-violet-500/10 text-violet-400",
    domain: "sentry.io",
    ready: true,
    permissions: ["Read errors", "Manage issues"]
  },
  {
    id: "linear",
    name: "Linear",
    provider: "Linear",
    description: "Manage issues and project cycles in Linear.",
    category: "Productivity",
    tone: "bg-indigo-600/10 text-indigo-400",
    domain: "linear.app",
    ready: false,
    permissions: ["Issue access", "Workspace search"]
  },
  {
    id: "trello",
    name: "Trello",
    provider: "Atlassian",
    description: "Manage boards and cards in Trello.",
    category: "Productivity",
    tone: "bg-blue-500/10 text-blue-400",
    domain: "trello.com",
    ready: false
  },
  {
    id: "jira",
    name: "Jira",
    provider: "Atlassian",
    description: "Enterprise issue and project tracking.",
    category: "Developer",
    tone: "bg-blue-600/10 text-blue-400",
    domain: "atlassian.com",
    ready: false
  },
  {
    id: "hubspot",
    name: "HubSpot",
    provider: "HubSpot",
    description: "Manage your CRM contacts and deals.",
    category: "Sales & Marketing",
    tone: "bg-orange-500/10 text-orange-400",
    domain: "hubspot.com",
    ready: true
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    provider: "Cloudflare",
    description: "Manage DNS, workers, and site security.",
    category: "Operations",
    tone: "bg-orange-600/10 text-orange-400",
    domain: "cloudflare.com",
    ready: false
  },
  {
    id: "aws",
    name: "AWS",
    provider: "Amazon",
    description: "Monitor your cloud infrastructure.",
    category: "Developer",
    tone: "bg-amber-500/10 text-amber-400",
    domain: "aws.amazon.com",
    ready: false
  },
  {
    id: "dropbox",
    name: "Dropbox",
    provider: "Dropbox",
    description: "Cloud storage and file sharing.",
    category: "Productivity",
    tone: "bg-blue-700/10 text-blue-400",
    domain: "dropbox.com",
    ready: false
  },
  {
    id: "canva",
    name: "Canva",
    provider: "Canva",
    description: "Design assets and visual content.",
    category: "Creative",
    tone: "bg-cyan-500/10 text-cyan-400",
    domain: "canva.com",
    ready: false
  },
  {
    id: "microsoft-365",
    name: "Microsoft 365",
    provider: "Microsoft",
    description: "Word, Excel, and Outlook integration.",
    category: "Productivity",
    tone: "bg-blue-600/10 text-blue-400",
    domain: "microsoft.com",
    ready: false
  }
];
