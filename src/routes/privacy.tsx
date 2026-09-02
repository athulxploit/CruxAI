import { createFileRoute, Link } from "@tanstack/react-router";
import { ArchLogo } from "@/components/arch/logo";
import { motion, useScroll } from "framer-motion";
import { useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Metrixcom" },
      { name: "description", content: "How Metrixcom collects, uses, protects, and deletes your data. GDPR-aligned data handling for a private AI workspace." },
      { property: "og:title", content: "Privacy Policy | Metrixcom" },
      { property: "og:description", content: "Metrixcom's commitment to data privacy and security." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

const LEGAL_SECTIONS = [
  {
    id: "privacy-overview",
    title: "Privacy Overview",
    items: [
      { id: "overview", label: "Overview", content: "Metrixcom AI, Inc. ('Company', 'we', 'us', or 'our') is committed to protecting your privacy." }
    ]
  },
  {
    id: "data-collection",
    title: "Data Collection",
    items: [
      { id: "information-you-provide", label: "Information you provide", active: true },
      { id: "information-automatically-collected", label: "Automatically collected", content: "Technical details like IP address, browser type, and usage patterns." },
      { id: "cookies-tracking", label: "Cookies & Tracking", content: "How we use cookies to improve your experience." }
    ]
  },
  {
    id: "data-usage",
    title: "How We Use Data",
    items: [
      { id: "service-provision", label: "Service Provision", content: "To provide and maintain the Metrixcom Engine and Services." },
      { id: "account-data", label: "Account Data", content: "Email, display name, and avatar information." },
      { id: "safety-security", label: "Safety & Security", content: "To detect and prevent fraud, abuse, and security risks." }
    ]
  },
  {
    id: "data-sharing",
    title: "Data Sharing",
    items: [
      { id: "third-party-ai", label: "AI Providers", content: "Prompts are shared with providers (e.g., Anthropic, OpenAI, Google) to generate responses." },
      { id: "service-providers", label: "Service Providers", content: "Vendors who help us operate our infrastructure and services." }
    ]
  },
  {
    id: "your-rights",
    title: "Your Rights & Choices",
    items: [
      { id: "access-portability", label: "Access & Portability", content: "Request a copy of the data we hold about you." },
      { id: "deletion-erasure", label: "Deletion & Erasure", content: "Delete your account and all associated personal information." }
    ]
  }
];

function PrivacyPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const [expandedSection, setExpandedSection] = useState<string | null>("data-collection");
  const [activeItem, setActiveItem] = useState("information-you-provide");

  return (
    <div ref={containerRef} className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] selection:bg-[#1A1A1A]/10 overflow-y-auto font-inter">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FDFCFB]/80 backdrop-blur-md border-b border-[#E5E5E5]">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <ArchLogo size={20} className="brightness-0" />
              <span className="font-semibold tracking-tight text-[15px]">metrixcom</span>
            </Link>
            <nav className="hidden lg:flex items-center gap-8 text-[14px] font-medium text-[#666666]">
              <a href="#" className="hover:text-[#1A1A1A] transition-colors">Products</a>
              <a href="#" className="hover:text-[#1A1A1A] transition-colors">Enterprise</a>
              <a href="#" className="hover:text-[#1A1A1A] transition-colors">Customers</a>
              <a href="#" className="hover:text-[#1A1A1A] transition-colors">Pricing</a>
              <a href="#" className="hover:text-[#1A1A1A] transition-colors">Resources</a>
            </nav>
          </div>
          <button className="bg-[#1A1A1A] text-white px-5 py-2 rounded-full text-[13px] font-semibold hover:bg-[#333333] transition-colors">
            Try Metrixcom
          </button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 pt-32 pb-24 flex flex-col lg:flex-row gap-16">
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-32 h-[calc(100vh-160px)] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-200">
          <nav className="space-y-1">
            {LEGAL_SECTIONS.map((section) => (
              <div key={section.id} className="border-b border-[#F0F0F0] py-2">
                <button
                  onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                  className="w-full flex items-center justify-between py-3 text-[14px] font-medium text-[#666666] hover:text-[#1A1A1A] transition-colors"
                >
                  {section.title}
                  {expandedSection === section.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {expandedSection === section.id && (
                  <div className="pl-4 pb-2 space-y-2 mt-1">
                    {section.items.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveItem(item.id);
                          document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className={cn(
                          "block w-full text-left text-[13px] transition-colors py-1",
                          activeItem === item.id 
                            ? "text-[#1A1A1A] font-medium" 
                            : "text-[#888888] hover:text-[#1A1A1A]"
                        )}
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1 max-w-[720px]">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Update Notice Banner */}
            <div className="bg-[#F5F5F5] rounded-2xl p-8 mb-12 border border-[#E5E5E5]/50">
              <h3 className="text-[15px] font-semibold mb-3 border-b border-[#E5E5E5] pb-2 inline-block">
                We recently updated our consumer Privacy Notice.
              </h3>
              <p className="text-[15px] text-[#444444] leading-relaxed font-light">
                We added more detail about how your information is used to provide the Metrixcom Engine. We clarified that we do not sell your personal data or use your private conversations to train advertisers.
              </p>
            </div>

            <h1 className="text-[48px] md:text-[64px] font-bold tracking-tight mb-8 text-[#1A1A1A]">
              Privacy Policy
            </h1>

            <div className="text-[15px] font-semibold text-[#666666] mb-8">
              Last updated: August 14, 2026
            </div>

            <div className="prose prose-neutral max-w-none space-y-8 text-[15px] text-[#444444] leading-[1.8] font-light">
              <section>
                <p>
                  Metrixcom AI, Inc. ("Company", "we", "us", or "our") is dedicated to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website <Link to="/" className="text-[#1A1A1A] underline decoration-[#E5E5E5] hover:decoration-[#1A1A1A] transition-colors">www.metrixcom.com</Link> and use the Metrixcom AI platform.
                </p>
              </section>

              <section>
                <h2 id="information-you-provide" className="text-[20px] font-bold text-[#1A1A1A]">1. Information We Collect</h2>
                <p>
                  We collect information that you provide directly to us when you create an account, use the Metrixcom Engine, or contact support.
                </p>
                <h3 className="text-[16px] font-semibold text-[#1A1A1A] mt-4">Personal Information</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Account Credentials:</strong> Email address and name provided during sign-up.</li>
                  <li><strong>User Content:</strong> Prompts, queries, and files uploaded to the Metrixcom Engine.</li>
                  <li><strong>Communication History:</strong> Records of your interactions with our support team.</li>
                </ul>
              </section>

              <section>
                <h2 id="service-provision" className="text-[20px] font-bold text-[#1A1A1A]">2. How We Use Your Information</h2>
                <p>
                  Your information is used to deliver the core AI services you request.
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>To provide and maintain the Metrixcom Engine and related applications.</li>
                  <li>To process transactions and manage your subscription.</li>
                  <li>To detect, prevent, and address technical issues or fraudulent activity.</li>
                  <li>To improve the Metrixcom Engine (we use aggregated, de-identified data for model refinement).</li>
                </ul>
              </section>

              <section>
                <h2 id="third-party-ai" className="text-[20px] font-bold text-[#1A1A1A]">3. Data Sharing and Disclosure</h2>
                <p>
                  We do not sell your personal data. We share information only in the following circumstances:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>AI Model Providers:</strong> Your prompts are sent to providers like Anthropic, OpenAI, or Google to generate responses. These providers are bound by confidentiality agreements.</li>
                  <li><strong>Service Providers:</strong> We use third-party vendors for cloud hosting (Supabase/AWS), payments (Razorpay/Stripe), and analytics.</li>
                  <li><strong>Legal Requirements:</strong> If required by law to comply with a subpoena, warrant, or court order.</li>
                </ul>
              </section>

              <section>
                <h2 id="access-portability" className="text-[20px] font-bold text-[#1A1A1A]">4. Data Retention</h2>
                <p>
                  We retain your information as long as your account is active or as needed to provide you with the Services. You can delete individual chats or your entire account at any time through the settings panel.
                </p>
              </section>

              <section>
                <h2 className="text-[20px] font-bold text-[#1A1A1A]">5. Security</h2>
                <p>
                  We implement enterprise-grade security including end-to-end encryption for data in transit and AES-256 encryption at rest. However, no method of transmission over the Internet is 100% secure.
                </p>
              </section>

              <section>
                <h2 className="text-[20px] font-bold text-[#1A1A1A]">6. Contact Us</h2>
                <p>
                  If you have questions or concerns about this Privacy Policy, please contact us at:
                </p>
                <div className="bg-[#F9F9F9] p-6 rounded-xl border border-[#EEE] mt-4">
                  <p className="font-semibold text-[#1A1A1A]">Metrixcom AI Legal Team</p>
                  <p>Email: legal@metrixcom.com</p>
                  <p>Attn: Athul Krishna PT, Founder</p>
                </div>
              </section>
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="border-t border-[#E5E5E5] py-12 mt-24">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-12">
            <Link to="/" className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100">
              <ArchLogo size={18} className="brightness-0" />
              <span className="font-semibold text-[13px]">metrixcom</span>
            </Link>
            <nav className="flex items-center gap-6 text-[12px] font-medium text-[#888888]">
              <Link to="/privacy" className="text-[#1A1A1A]">Privacy</Link>
              <Link to="/terms" className="hover:text-[#1A1A1A] transition-colors">Terms</Link>
              <Link to="/help" className="hover:text-[#1A1A1A] transition-colors">Support</Link>
            </nav>
          </div>
          <div className="text-[11px] font-medium text-[#BBBBBB] uppercase tracking-[0.2em]">
            © 2026 METRIXCOMM AI, INC.
          </div>
        </div>
      </footer>
    </div>
  );
}
