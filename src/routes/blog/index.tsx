import { createFileRoute, Link } from "@tanstack/react-router";
import { HelpShell, MotionSection } from "@/components/arch/help-shell";
import { Calendar, User, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/blog/")({
  head: () => {
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Blog",
      "name": "Metrixcom Blog",
      "description": "Engineering insights, model updates, and AI research from the Metrixcom team.",
      "publisher": {
        "@type": "Organization",
        "name": "Metrixcom",
        "logo": {
          "@type": "ImageObject",
          "url": "https://metrixcom.com/logo.png"
        }
      },
      "blogPost": POSTS.map(post => ({
        "@type": "BlogPosting",
        "headline": post.title,
        "description": post.excerpt,
        "datePublished": post.date,
        "author": {
          "@type": "Person",
          "name": post.author
        },
        "image": post.image,
        "publisher": {
          "@type": "Organization",
          "name": "Metrixcom"
        }
      }))
    };

    return {
      meta: [
        { title: "Blog — Metrixcom" },
        { name: "description", content: "Engineering insights, model updates, and AI research from the Metrixcom team. Stay updated on the latest in AI development." },
        { property: "og:title", content: "Metrixcom Blog" },
        { property: "og:description", content: "Insights into AI research, engineering updates, and new features from Metrixcom." },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(jsonLd),
        },
      ],
    };
  },
  component: BlogPage,
});

const POSTS = [
  {
    title: "Metrix-3 Engine: A New Frontier in Reasoning",
    excerpt: "Deep dive into our latest model orchestration layer and how it handles complex engineering tasks with multi-provider failover.",
    date: "Aug 12, 2026",
    author: "Athul Krishna PT",
    category: "Research",
    image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=2000"
  },
  {
    title: "Introducing Metrixcom Computer",
    excerpt: "Control your local and cloud infrastructure through a unified AI interface. Secure, sandboxed, and built for builders.",
    date: "Aug 06, 2026",
    author: "Engineering Team",
    category: "Product",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2000"
  },
  {
    title: "The Architecture of Cipher-1",
    excerpt: "How we built a specialized security agent for ethical penetration testing and vulnerability analysis.",
    date: "July 28, 2026",
    author: "Security Team",
    category: "Security",
    image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=2000"
  }
];

function BlogPage() {
  return (
    <HelpShell 
      title="The Metrixcom Blog" 
      description="Engineering updates, research breakthroughs, and news from the frontier of AI."
    >
      <div className="space-y-24">
        {/* Featured Post */}
        <MotionSection>
          <div className="group relative aspect-[21/9] w-full rounded-3xl overflow-hidden border border-border/50 bg-muted cursor-pointer">
            <img 
              src={POSTS[0].image} 
              alt={POSTS[0].title} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-12 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold uppercase tracking-widest mb-4 backdrop-blur-md">
                Featured Post
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 group-hover:text-primary transition-colors">
                {POSTS[0].title}
              </h2>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed line-clamp-2">
                {POSTS[0].excerpt}
              </p>
              <div className="flex items-center gap-6 text-[13px] text-muted-foreground font-medium">
                <div className="flex items-center gap-2"><User className="h-4 w-4" /> {POSTS[0].author}</div>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {POSTS[0].date}</div>
              </div>
            </div>
          </div>
        </MotionSection>

        {/* Post Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {POSTS.slice(1).map((post, i) => (
            <MotionSection key={post.title} delay={i * 0.1}>
              <div className="group cursor-pointer">
                <div className="aspect-[16/10] w-full rounded-2xl overflow-hidden border border-border/50 bg-muted mb-6">
                  <img 
                    src={post.image} 
                    alt={post.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                  />
                </div>
                <div className="inline-flex items-center gap-2 text-primary text-[11px] font-bold uppercase tracking-widest mb-3">
                  {post.category}
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors tracking-tight">
                  {post.title}
                </h3>
                <p className="text-muted-foreground text-[15px] leading-relaxed mb-6 line-clamp-3">
                  {post.excerpt}
                </p>
                <div className="flex items-center gap-2 text-[13px] font-bold group-hover:gap-3 transition-all">
                  Read article <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </MotionSection>
          ))}
        </div>
      </div>
    </HelpShell>
  );
}
