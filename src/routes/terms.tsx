import { createFileRoute, Link } from "@tanstack/react-router";
import { ArchLogo } from "@/components/arch/logo";
import { motion, useScroll } from "framer-motion";
import { useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Metrixcom" },
      { name: "description", content: "Terms governing your use of Metrixcom — acceptable use, account rules, AI output limits, and liability." },
      { property: "og:title", content: "Terms of Service | Metrixcom" },
      { property: "og:description", content: "Legal terms and conditions for using the Metrixcom platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

const LEGAL_SECTIONS = [
  {
    id: "legal-overview",
    title: "Legal overview",
    items: [
      { id: "agreement", label: "The Agreement", content: "This Terms of Service constitutes a legally binding agreement between you and Metrixcom AI, Inc." }
    ]
  },
  {
    id: "platform-terms",
    title: "Platform User Terms",
    items: [
      { id: "tos", label: "Terms of Service", active: true },
      { id: "acceptable-use", label: "Acceptable Use Policy", content: "Guidelines for lawful and ethical use of our AI engines." },
      { id: "account-registration", label: "Account Registration", content: "Requirements for creating and maintaining your user account." }
    ]
  },
  {
    id: "usage-billing",
    title: "Usage & Billing",
    items: [
      { id: "fees-payment", label: "Fees & Payment", content: "Details regarding subscriptions, tokens, and billing cycles." },
      { id: "refund-policy", label: "Refund Policy", content: "Conditions under which refunds may be issued." }
    ]
  },
  {
    id: "content-ip",
    title: "Content & IP",
    items: [
      { id: "user-content", label: "Your Content", content: "Your rights and responsibilities regarding the data you provide." },
      { id: "metrixcom-ip", label: "Metrixcom IP", content: "Ownership of the Metrixcom Engine and platform technologies." }
    ]
  },
  {
    id: "legal-provisions",
    title: "Legal Provisions",
    items: [
      { id: "disclaimer", label: "Disclaimers", content: "Limitations of warranties regarding AI-generated outputs." },
      { id: "liability", label: "Limitation of Liability", content: "Our legal responsibility to you." },
      { id: "disputes", label: "Dispute Resolution", content: "How legal disagreements are handled." }
    ]
  }
];

function TermsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const [expandedSection, setExpandedSection] = useState<string | null>("platform-terms");
  const [activeItem, setActiveItem] = useState("tos");

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
                We recently updated our Terms of Service.
              </h3>
              <p className="text-[15px] text-[#444444] leading-relaxed font-light">
                We clarified our policies regarding AI output ownership, usage limits for free tiers, and our dispute resolution process. Please review these terms carefully as they affect your legal rights.
              </p>
            </div>

            <h1 className="text-[48px] md:text-[64px] font-bold tracking-tight mb-8 text-[#1A1A1A]">
              Terms of Service
            </h1>

            <div className="text-[15px] font-semibold text-[#666666] mb-8">
              Last updated: August 14, 2026
            </div>

            <div className="prose prose-neutral max-w-none space-y-8 text-[15px] text-[#444444] leading-[1.8] font-light">
              <section>
                <p>
                  Welcome to Metrixcom. These Terms of Service ("Terms") govern your access to and use of Metrixcom AI, Inc.'s ("Company", "we", "us", or "our") website, applications, and the Metrixcom Engine (collectively, the "Services").
                </p>
                <p>
                  By using our Services, you agree to be bound by these Terms. If you do not agree to these Terms, including the mandatory arbitration provision, do not access or use our Services.
                </p>
              </section>

              <section>
                <h2 id="tos" className="text-[20px] font-bold text-[#1A1A1A]">1. Acceptable Use</h2>
                <p>
                  You are responsible for your use of the Services and for any content you provide. You agree not to use the Services for any illegal or unauthorized purpose, including but not limited to:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Generating content that encourages violence or illegal acts.</li>
                  <li>Attempting to reverse-engineer or extract the weights of the Metrixcom Engine.</li>
                  <li>Bypassing any rate limits or security measures of the platform.</li>
                  <li>Using the Services to create a competing AI product or service.</li>
                </ul>
              </section>

              <section>
                <h2 id="user-content" className="text-[20px] font-bold text-[#1A1A1A]">2. User Content & IP</h2>
                <p>
                  You retain ownership of the input data you provide to the Metrixcom Engine. As between you and Metrixcom, and to the extent permitted by law, you own the output generated by the Engine based on your inputs.
                </p>
                <p>
                  Metrixcom owns all rights, title, and interest in and to the Services, including the Metrixcom Engine models, architecture, and proprietary software.
                </p>
              </section>

              <section>
                <h2 id="fees-payment" className="text-[20px] font-bold text-[#1A1A1A]">3. Subscriptions & Payment</h2>
                <p>
                  Certain features of the Services require a paid subscription. All fees are non-refundable except as required by law or as explicitly stated in our Refund Policy. We reserve the right to change our prices with notice to you.
                </p>
              </section>

              <section>
                <h2 id="disclaimer" className="text-[20px] font-bold text-[#1A1A1A]">4. Disclaimers</h2>
                <p>
                  THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE." WE DO NOT GUARANTEE THE ACCURACY, COMPLETENESS, OR RELIABILITY OF ANY OUTPUT GENERATED BY THE METRIXCOMM ENGINE. AI-GENERATED CONTENT MAY CONTAIN ERRORS OR INACCURACIES.
                </p>
              </section>

              <section>
                <h2 id="liability" className="text-[20px] font-bold text-[#1A1A1A]">5. Limitation of Liability</h2>
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, METRIXCOMM AI, INC. SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICES.
                </p>
              </section>

              <section>
                <h2 className="text-[20px] font-bold text-[#1A1A1A]">6. Governing Law</h2>
                <p>
                  These Terms are governed by the laws of the State of Delaware, without regard to its conflict of laws principles.
                </p>
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
              <Link to="/privacy" className="hover:text-[#1A1A1A] transition-colors">Privacy</Link>
              <Link to="/terms" className="text-[#1A1A1A]">Terms</Link>
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
