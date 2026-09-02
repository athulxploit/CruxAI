// Connector directory catalog for the Integrations page.
// Grouped by category, mirroring a modern connectors marketplace layout.

import { getBrandDomain } from "./connectors-registry";

export type ConnectorCategory =
  | "Popular"
  | "New"
  | "Creative"
  | "Communication"
  | "Data & Analytics"
  | "Developer"
  | "Finance"
  | "Health"
  | "Operations"
  | "Productivity"
  | "Sales & Marketing";

export type Connector = {
  id: string;
  name: string;
  description: string;
  category: ConnectorCategory;
  /** Tailwind classes for the icon tile background. */
  tone: string;
  verified?: boolean;
  popular?: boolean;
  isNew?: boolean;
  /** Brand domain used to load the real logo. */
  domain?: string;
  /** Permission list for UI display */
  permissions?: string[];
  /** Whether the connector is fully implemented and ready to connect */
  ready?: boolean;
};

export const CONNECTOR_CATEGORIES: ConnectorCategory[] = [
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

export const CONNECTORS: Connector[] = [
  // Popular
  { id: "gmail-calendar", name: "Gmail with Calendar", description: "Search, create, and manage your emails and calendar events", category: "Popular", tone: "bg-red-500/15 text-red-400", verified: true, popular: true, ready: true, permissions: ["Read your emails", "Search your mailbox", "Manage your calendar events"] },
  { id: "outlook", name: "Outlook", description: "Search your emails and calendar events", category: "Popular", tone: "bg-blue-500/15 text-blue-400", verified: true, ready: true, permissions: ["Read your emails", "Access your calendar"] },
  { id: "hubspot", name: "HubSpot", description: "Retrieve, create, and update CRM objects; manage contacts, companies, deals", category: "Popular", tone: "bg-orange-500/15 text-orange-400", verified: true, ready: true, permissions: ["Manage contacts", "Read deals", "Update companies"] },
  { id: "monday", name: "Monday.com", description: "Manage boards, items, and groups; create updates and sub-items; automate", category: "Popular", tone: "bg-pink-500/15 text-pink-400", verified: true, ready: true, permissions: ["Read boards", "Manage items"] },
  { id: "google-drive", name: "Google Drive", description: "Attach files from your own Drive to any chat — Docs, Slides, and Sheets included", category: "Popular", tone: "bg-emerald-500/15 text-emerald-400", verified: true, popular: true, ready: true, permissions: ["Read your files", "Search your drive"] },
  { id: "vercel", name: "Vercel", description: "Manage teams, projects, and deployments; search documentation and logs", category: "Popular", tone: "bg-foreground/10 text-foreground", verified: true, ready: true, permissions: ["Manage deployments", "Read project logs"] },

  // New
  { id: "dub", name: "Dub", description: "Connect to Dub to manage your partner program, short links, and conversion", category: "New", tone: "bg-foreground/10 text-foreground", verified: true, isNew: true },
  { id: "dnb", name: "D&B Commercial Graph", description: "Match companies to D-U-N-S numbers and retrieve firmographic, credit risk", category: "New", tone: "bg-sky-500/15 text-sky-400", verified: true, isNew: true },

  { id: "wisesheets", name: "Wisesheets", description: "Search SEC-sourced fundamentals, financial statements, and metrics", category: "New", tone: "bg-indigo-500/15 text-indigo-400", verified: true, isNew: true },
  { id: "crunchbase", name: "Crunchbase", description: "Research companies, funding rounds, investors and people with live data", category: "New", tone: "bg-blue-500/15 text-blue-400", verified: true, isNew: true },
  { id: "flanks", name: "Flanks", description: "Multi-bank investment data for wealth managers. Connect bank accounts", category: "New", tone: "bg-violet-500/15 text-violet-400", verified: true, isNew: true },
  { id: "personal-cfo", name: "Personal CFO", description: "See your net worth across connected bank, brokerage, crypto, and private", category: "New", tone: "bg-teal-500/15 text-teal-400", verified: true, popular: true },


  // Creative
  { id: "lucid", name: "Lucid", description: "Ideate, diagram, and align teams", category: "Creative", tone: "bg-foreground/10 text-foreground", verified: true },
  { id: "whimsical", name: "Whimsical", description: "Create, edit, and read Whimsical content from coding agents with MCP", category: "Creative", tone: "bg-purple-500/15 text-purple-400", verified: true },
  { id: "biorender", name: "BioRender", description: "Create professional scientific figures, diagrams, and posters", category: "Creative", tone: "bg-blue-500/15 text-blue-400", verified: true },
  { id: "figma", name: "Figma", description: "Comprehensive Figma connector for managing files, projects, teams", category: "Creative", tone: "bg-rose-500/15 text-rose-400", verified: true },
  { id: "twitch", name: "Twitch", description: "Twitch is an interactive livestreaming service for content spanning gaming", category: "Creative", tone: "bg-purple-500/15 text-purple-400", popular: true },
  { id: "canva", name: "Canva Enterprise", description: "Enable your organization to create, collaborate, and publish visual content", category: "Creative", tone: "bg-cyan-500/15 text-cyan-400", verified: true },

  // Communication
  { id: "outlook-comm", name: "Outlook", description: "Search your emails and calendar events", category: "Communication", tone: "bg-blue-500/15 text-blue-400", verified: true, popular: true },
  { id: "intercom", name: "Intercom", description: "Search conversations and contacts, retrieve customer data, and access", category: "Communication", tone: "bg-sky-500/15 text-sky-400", verified: true },
  { id: "x-twitter", name: "X (Twitter)", description: "Search and analyze real-time X/Twitter posts, profiles, conversations, trends", category: "Communication", tone: "bg-foreground/10 text-foreground", verified: true },
  { id: "smstools", name: "SMSTools", description: "Text Message Marketing Platform Low cost Bulk SMS", category: "Communication", tone: "bg-red-500/15 text-red-400", verified: true },
  { id: "z-api", name: "Z-API", description: "An API for integration with WhatsApp.", category: "Communication", tone: "bg-green-500/15 text-green-400", verified: true },
  { id: "zoom-admin", name: "Zoom Admin", description: "Video conferencing (includes account-level scopes) for Zoom Admins.", category: "Communication", tone: "bg-blue-500/15 text-blue-400", verified: true },
  { id: "slack", name: "Slack", description: "Send summaries, search channels, and receive replies in Slack", category: "Communication", tone: "bg-fuchsia-500/15 text-fuchsia-400", verified: true, ready: true, permissions: ["Read channels", "Send messages"] },
  { id: "discord", name: "Discord", description: "Post notifications and answers to a Discord channel", category: "Communication", tone: "bg-indigo-500/15 text-indigo-400", verified: true, ready: true, permissions: ["Read messages", "Send replies"] },

  // Data & Analytics
  { id: "unwrap", name: "Unwrap", description: "Transparent and accurate insights shared across your entire organization", category: "Data & Analytics", tone: "bg-red-500/15 text-red-400", verified: true },
  { id: "clickup", name: "ClickUp", description: "ClickUp is an all-in-one productivity platform that works as an ideal place", category: "Data & Analytics", tone: "bg-pink-500/15 text-pink-400", verified: true },
  { id: "cb-insights", name: "CB Insights (Self-Licensed)", description: "Search market insights, market maps, and company activity", category: "Data & Analytics", tone: "bg-blue-500/15 text-blue-400", verified: true },
  { id: "similarweb", name: "Similarweb", description: "Analyze and compare website and app traffic, rankings, and audience behavior", category: "Data & Analytics", tone: "bg-orange-500/15 text-orange-400", verified: true },
  { id: "amplitude", name: "Amplitude", description: "AI analytics platform for modern digital analytics", category: "Data & Analytics", tone: "bg-foreground/10 text-foreground", verified: true },
  { id: "prisma-postgres", name: "Prisma Postgres", description: "Instant serverless Postgres, zero setup.", category: "Data & Analytics", tone: "bg-slate-500/15 text-slate-300", verified: true },

  // Developer
  { id: "github", name: "GitHub", description: "Give Forge-1 access to your repositories. Browse and attach any file to a chat.", category: "Developer", tone: "bg-foreground/10 text-foreground", verified: true, popular: true, ready: true, permissions: ["Read repositories", "Access public files"] },
  { id: "neon", name: "Neon", description: "Connect to Neon to manage your serverless Postgres projects, branches", category: "Developer", tone: "bg-emerald-500/15 text-emerald-400", verified: true },
  { id: "stytch", name: "Stytch", description: "Authenticate and secure users with Stytch, unifying login, authorization", category: "Developer", tone: "bg-sky-500/15 text-sky-400", verified: true },
  { id: "jam", name: "Jam", description: "Access bug recordings with video, console logs, errors, network requests", category: "Developer", tone: "bg-rose-500/15 text-rose-400", verified: true },
  { id: "datadog", name: "Datadog", description: "Datadog is a cloud-based monitoring and analytics platform for infrastructure", category: "Developer", tone: "bg-purple-500/15 text-purple-400", verified: true },
  { id: "sentry", name: "Sentry", description: "Track application errors, releases, and performance regressions", category: "Developer", tone: "bg-violet-500/15 text-violet-400", verified: true },

  // Finance
  { id: "carbon-arc", name: "Carbon Arc", description: "Connect to Carbon Arc to access real-time transaction data insights and entity", category: "Finance", tone: "bg-orange-500/15 text-orange-400", verified: true },
  { id: "link", name: "Link", description: "Link CLI lets agents get secure, one-time-use payment credentials from a Link", category: "Finance", tone: "bg-green-500/15 text-green-400", verified: true },
  { id: "wisesheets-fin", name: "Wisesheets", description: "Search SEC-sourced fundamentals, financial statements, and metrics", category: "Finance", tone: "bg-indigo-500/15 text-indigo-400", verified: true, isNew: true },
  { id: "morningstar", name: "Morningstar", description: "Access financial data, stock metrics, fund ratings, and investment research", category: "Finance", tone: "bg-red-500/15 text-red-400", verified: true },
  { id: "base-coinbase", name: "Base by Coinbase", description: "Connects to your Base Account. Check balances, send funds, swap tokens", category: "Finance", tone: "bg-blue-500/15 text-blue-400", verified: true },
  { id: "razorpay", name: "Razorpay", description: "Accept payments, manage subscriptions, and view payouts", category: "Finance", tone: "bg-blue-600/15 text-blue-400", verified: true, ready: true, permissions: ["Create orders", "Verify payments", "Read transactions"] },
  { id: "meow", name: "Meow", description: "One platform for business banking, cards, global payments, and crypto", category: "Finance", tone: "bg-amber-500/15 text-amber-400", verified: true },

  // Health
  { id: "health-fitness", name: "Health and Fitness Apps", description: "Securely connect your health apps and wearables for personalized health", category: "Health", tone: "bg-rose-500/15 text-rose-400", verified: true, popular: true },

  { id: "benchling", name: "Benchling", description: "Query and manage life sciences R&D data including notebook entries, DNA", category: "Health", tone: "bg-blue-500/15 text-blue-400", verified: true },
  { id: "strava", name: "Strava", description: "Designed by athletes, for athletes, Strava's mobile app and website connect", category: "Health", tone: "bg-orange-500/15 text-orange-400", popular: true },

  // Operations
  { id: "monday-ops", name: "Monday.com", description: "Manage boards, items, and groups; create updates and sub-items; automate", category: "Operations", tone: "bg-pink-500/15 text-pink-400", verified: true, popular: true },
  { id: "atlassian", name: "Atlassian", description: "Atlassian's team collaboration software like Jira, Confluence and Trello", category: "Operations", tone: "bg-blue-500/15 text-blue-400", verified: true },
  { id: "ticket-tailor", name: "Ticket Tailor", description: "Connect to Ticket Tailor", category: "Operations", tone: "bg-foreground/10 text-foreground", verified: true },
  { id: "shopify", name: "Shopify", description: "Comprehensive Shopify e-commerce platform connector for managing stores", category: "Operations", tone: "bg-green-500/15 text-green-400", verified: true },
  { id: "smartsheet", name: "Smartsheet", description: "Manage and collaborate on Smartsheet projects, sheets, rows, columns", category: "Operations", tone: "bg-blue-500/15 text-blue-400", verified: true },
  { id: "carta", name: "Carta", description: "Access cap table and investor data directly to your AI workflow. Cap table", category: "Operations", tone: "bg-foreground/10 text-foreground", verified: true },

  // Productivity
  { id: "gmail-calendar-prod", name: "Gmail with Calendar", description: "Search, create, and manage your emails and calendar events", category: "Productivity", tone: "bg-red-500/15 text-red-400", verified: true, popular: true },
  { id: "todoist", name: "Todoist", description: "Todoist is a delightfully simple yet powerful task planner and to-do list app.", category: "Productivity", tone: "bg-red-500/15 text-red-400", verified: true },
  { id: "cal-com", name: "Cal.com", description: "A fully customizable scheduling software for individuals, businesses", category: "Productivity", tone: "bg-foreground/10 text-foreground", verified: true },
  { id: "metaview", name: "Metaview", description: "AI agents for recruiting", category: "Productivity", tone: "bg-foreground/10 text-foreground", verified: true },
  { id: "circleback", name: "Circleback", description: "Connect to Circleback.ai", category: "Productivity", tone: "bg-orange-500/15 text-orange-400", verified: true },
  { id: "fireflies", name: "Fireflies", description: "Access meeting transcripts, summaries, speaker information, and metadata", category: "Productivity", tone: "bg-fuchsia-500/15 text-fuchsia-400", verified: true },
  { id: "notion", name: "Notion", description: "Search and cite pages from your Notion workspace", category: "Productivity", tone: "bg-foreground/10 text-foreground", verified: true, ready: true, permissions: ["Read pages", "Search workspace"] },

  // Sales & Marketing
  { id: "hubspot-sales", name: "HubSpot", description: "Retrieve, create, and update CRM objects; manage contacts, companies, deals", category: "Sales & Marketing", tone: "bg-orange-500/15 text-orange-400", verified: true, popular: true },
  { id: "clickup-sales", name: "ClickUp", description: "ClickUp is an all-in-one productivity platform that works as an ideal place", category: "Sales & Marketing", tone: "bg-pink-500/15 text-pink-400", verified: true },
  { id: "klaviyo", name: "Klaviyo", description: "Manage profiles, lists, segments, campaigns, flows, events, metrics", category: "Sales & Marketing", tone: "bg-foreground/10 text-foreground", verified: true },
  { id: "airops", name: "AirOps", description: "Execute workflows and manage AI-powered automation tasks", category: "Sales & Marketing", tone: "bg-emerald-500/15 text-emerald-400", verified: true },
  { id: "similarweb-sales", name: "Similarweb", description: "Analyze and compare website and app traffic, rankings, and audience behavior", category: "Sales & Marketing", tone: "bg-orange-500/15 text-orange-400", verified: true },
  { id: "bitly", name: "Bitly", description: "Shorten, brand, and track links with Bitly to manage URL sharing, QR codes", category: "Sales & Marketing", tone: "bg-orange-500/15 text-orange-400", verified: true },
];

