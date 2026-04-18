import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';
import {
  Music,
  Users,
  Star,
  Calendar,
  MessageSquare,
  ArrowRight,
  Headphones,
  Mic,
  Guitar,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { userService } from '@/services/user';
import type { UserProfile } from '@/services/user';
import { formatGHSWithSymbol } from '@/lib/currency';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { cn } from '@/lib/utils';

interface TextScrambleQueueItem {
  from: string;
  to: string;
  start: number;
  end: number;
  char?: string;
}

interface TextScrambleSegment {
  type: 'text' | 'html';
  content: string;
}

/**
 * Scramble animation for rich-text hero lines. Maps only the first `plainTargetLength`
 * glyphs of `output` into HTML segments so phrase length changes cannot drop words.
 */
class TextScramble {
  el: HTMLElement;
  chars: string;
  queue: TextScrambleQueueItem[];
  frame: number;
  frameRequest: number;
  resolve: (() => void) | null;
  htmlStructure: TextScrambleSegment[];
  targetHTML: string;
  plainTargetLength: number;

  constructor(el: HTMLElement) {
    this.el = el;
    this.chars = '!<>-_\\/*&^%$#@[]{}—=+?';
    this.queue = [];
    this.frame = 0;
    this.frameRequest = 0;
    this.resolve = null;
    this.htmlStructure = [];
    this.targetHTML = '';
    this.plainTargetLength = 0;
  }

  cancel() {
    cancelAnimationFrame(this.frameRequest);
    this.frameRequest = 0;
    if (this.resolve) {
      this.resolve();
      this.resolve = null;
    }
    this.queue = [];
  }

  parseHTML(html: string): TextScrambleSegment[] {
    const segments: TextScrambleSegment[] = [];
    const regex = /(<[^>]+>)|([^<]+)/g;
    regex.lastIndex = 0;
    let match;

    while ((match = regex.exec(html)) !== null) {
      if (match[1]) {
        segments.push({ type: 'html', content: match[1] });
      } else if (match[2] != null && match[2].length > 0) {
        segments.push({ type: 'text', content: match[2] });
      }
    }

    return segments;
  }

  reconstructHTML(segments: TextScrambleSegment[], scrambledText: string): string {
    let textIndex = 0;
    let result = '';

    for (const segment of segments) {
      if (segment.type === 'html') {
        result += segment.content;
      } else {
        const textLength = segment.content.length;
        result += scrambledText.slice(textIndex, textIndex + textLength);
        textIndex += textLength;
      }
    }

    return result;
  }

  setText(newText: string) {
    const oldText = this.el.textContent ?? '';
    this.targetHTML = newText;

    this.htmlStructure = this.parseHTML(newText);
    /** Plain characters in segment order — always matches reconstructHTML text slots. */
    const newPlain = this.htmlStructure
      .filter((s): s is TextScrambleSegment & { type: 'text' } => s.type === 'text')
      .map((s) => s.content)
      .join('');
    this.plainTargetLength = newPlain.length;

    const length = Math.max(oldText.length, newPlain.length);
    const promise = new Promise<void>((resolve) => {
      this.resolve = resolve;
    });
    this.queue = [];

    for (let i = 0; i < length; i++) {
      const from = oldText[i] || '';
      const to = newPlain[i] || '';
      const start = Math.floor(Math.random() * 40);
      const end = start + Math.floor(Math.random() * 40);
      this.queue.push({ from, to, start, end });
    }

    cancelAnimationFrame(this.frameRequest);
    this.frame = 0;
    this.update();
    return promise;
  }

  update() {
    let output = '';
    let complete = 0;

    for (let i = 0, n = this.queue.length; i < n; i++) {
      const item = this.queue[i]!;
      const { from, to, start, end } = item;
      let { char } = item;

      if (this.frame >= end) {
        complete++;
        output += to;
      } else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = this.randomChar();
          item.char = char;
        }
        output += char;
      } else {
        output += from;
      }
    }

    const len = this.plainTargetLength;
    const plainForHtml =
      output.length >= len ? output.slice(0, len) : output + ' '.repeat(Math.max(0, len - output.length));

    const finalHTML = this.reconstructHTML(this.htmlStructure, plainForHtml);
    this.el.innerHTML = finalHTML;

    if (complete === this.queue.length) {
      if (this.resolve) this.resolve();
    } else {
      this.frameRequest = requestAnimationFrame(() => this.update());
      this.frame++;
    }
  }

  randomChar() {
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  }
}

/** lg+ — crossfade only (no innerHTML scramble) = stable desktop, no layout glitches */
const DESKTOP_HERO_BREAKPOINT_PX = 1024;

const HERO_HEADLINE_CLASS =
  'fixed-height-text max-w-full text-2xl font-bold leading-tight tracking-tight break-words text-pretty [overflow-wrap:anywhere] sm:text-3xl md:text-4xl lg:text-fluid-3xl lg:text-balance';

const HERO_PHRASES: React.ReactNode[] = [
  <>
    Where <span className="text-primary">Music</span> Meets Opportunity
  </>,
  <>
    Connect with <span className="text-primary">Musicians</span>
  </>,
  <>
    Find Your <span className="text-primary">Perfect</span> Sound
  </>,
  <>
    Book <span className="text-primary">Talent</span> Instantly
  </>,
  <>
    Where <span className="text-primary">Music</span> Meets Opportunity
  </>,
];

function HeroDesktopCrossfadeHeadline({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  const [phraseIx, setPhraseIx] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = window.setInterval(() => {
      setPhraseIx((i) => (i + 1) % HERO_PHRASES.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [prefersReducedMotion]);

  const active = prefersReducedMotion ? 0 : phraseIx;

  return (
    <h1
      className={cn(
        HERO_HEADLINE_CLASS,
        'grid [&>*]:col-start-1 [&>*]:row-start-1 [&>*]:min-w-0 place-items-start'
      )}
      aria-live={prefersReducedMotion ? undefined : 'polite'}
    >
      {HERO_PHRASES.map((phrase, i) => (
        <span
          key={i}
          className={cn(
            'max-w-full transition-opacity duration-500 ease-out motion-reduce:transition-none',
            i === active ? 'relative z-[1] opacity-100' : 'z-0 opacity-0 pointer-events-none'
          )}
          aria-hidden={i !== active}
        >
          {phrase}
        </span>
      ))}
    </h1>
  );
}

const Index = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { theme, toggleTheme, settings } = useTheme();
  const heroHeadingRef = useRef<HTMLHeadingElement>(null);
  const [desktopWideHero, setDesktopWideHero] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(`(min-width: ${DESKTOP_HERO_BREAKPOINT_PX}px)`).matches : false
  );
  const [currentSlide, setCurrentSlide] = useState(0);
  const [api, setApi] = useState<any>();
  const prefersReducedMotion = useReducedMotion();
  const [featuredMusicians, setFeaturedMusicians] = useState<UserProfile[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState(false);

  // Get admin colors or fallback to defaults
  const primaryColor = settings?.appearance?.primaryColor || '#8B5CF6';
  const secondaryColor = settings?.appearance?.secondaryColor || '#EC4899';

  useEffect(() => {
    if (!api) return;
    api.on('select', () => {
      setCurrentSlide(api.selectedScrollSnap());
    });
  }, [api]);

  const scrollTo = (index: number) => {
    if (api) {
      api.scrollTo(index);
    }
  };

  // Calculate number of dot indicators based on slides and viewport
  const totalSlides = 5; // We have 5 carousel items
  const getDotsCount = () => {
    if (window.innerWidth >= 1024) return Math.max(1, totalSlides - 2); // lg: shows 3 at once
    if (window.innerWidth >= 768) return Math.max(1, totalSlides - 1); // md: shows 2 at once
    return totalSlides; // mobile: shows 1 at once
  };

  const [dotsCount, setDotsCount] = useState(getDotsCount());

  useEffect(() => {
    const handleResize = () => {
      setDotsCount(getDotsCount());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadFeaturedMusicians = async () => {
      setFeaturedLoading(true);
      setFeaturedError(false);
      try {
        const users = await userService.getUsers({ role: 'musician', status: 'active' });
        const sorted = [...users].sort(
          (a, b) => (b.rating ?? 0) - (a.rating ?? 0)
        );
        const selected = sorted.slice(0, 3);

        if (isActive) {
          setFeaturedMusicians(selected);
        }
      } catch {
        if (isActive) {
          setFeaturedError(true);
          setFeaturedMusicians([]);
        }
      } finally {
        if (isActive) {
          setFeaturedLoading(false);
        }
      }
    };

    loadFeaturedMusicians();

    return () => {
      isActive = false;
    };
  }, []);

  // Handle theme cycling
  const cycleTheme = () => {
    toggleTheme();
  };

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_HERO_BREAKPOINT_PX}px)`);
    const sync = () => setDesktopWideHero(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    setIsVisible(true);

    /** Desktop uses React crossfade only — scramble would glitch (innerHTML / RAF). */
    if (!heroHeadingRef.current || prefersReducedMotion || desktopWideHero) {
      return;
    }

    const el = heroHeadingRef.current;
    const textScramble = new TextScramble(el);
    const phrases = [
      'Where <span class="text-primary">Music</span> Meets Opportunity',
      'Connect with <span class="text-primary">Musicians</span>',
      'Find Your <span class="text-primary">Perfect</span> Sound',
      'Book <span class="text-primary">Talent</span> Instantly',
      'Where <span class="text-primary">Music</span> Meets Opportunity',
    ];

    let cancelled = false;
    let counter = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNext = () => {
      if (cancelled) return;
      timeoutId = window.setTimeout(runPhrase, 3200);
    };

    const runPhrase = () => {
      if (cancelled) return;
      const nextPhrase = phrases[counter] ?? '';
      counter = (counter + 1) % phrases.length;
      textScramble.setText(nextPhrase).then(() => {
        if (!cancelled) scheduleNext();
      });
    };

    runPhrase();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      textScramble.cancel();
    };
  }, [prefersReducedMotion, desktopWideHero]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/90 to-primary/20 overflow-x-hidden">
      {/* Logo centered at the top with floating animation */}
      <div className="container mx-auto px-4 pt-6 pb-8 sm:py-8 flex flex-col items-center justify-center">
        <div className="relative">
          {/* Audio Waveform Shield Logo */}
          <img 
            src="/logo.svg" 
            alt="Rhythm Guardian Logo"
            className={`w-44 h-44 sm:w-72 sm:h-72 -mb-6 sm:-mb-8 object-contain ${prefersReducedMotion ? '' : 'animate-float'} md:hover:scale-110 transition-transform duration-300`}
            style={{
              filter: `drop-shadow(0 0 20px ${primaryColor}60)`,
            } as React.CSSProperties}
          />
          <div
            className={`absolute -inset-8 rounded-full blur-xl opacity-70 pointer-events-none ${prefersReducedMotion ? '' : 'animate-pulse'}`}
            style={{
              background: `radial-gradient(circle, ${primaryColor}20, ${secondaryColor}10, transparent)`
            }}
          ></div>
        </div>

        <h1
          className={`text-3xl sm:text-display-xl text-logo bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary pointer-events-none ${prefersReducedMotion ? '' : 'animate-gradient'}`}
        >
          Rhythm Guardian
        </h1>

        <div className="flex gap-4 mt-4">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="relative overflow-hidden group">
              <span className="relative z-10">Login</span>
              <span className="absolute inset-0 bg-primary/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></span>
            </Button>
          </Link>

          <Link to="/signup">
            <Button variant="outline" size="sm" className="relative overflow-hidden group">
              <span className="relative z-10">Sign Up</span>
              <span className="absolute inset-0 bg-primary/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></span>
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={cycleTheme}
            className="flex items-center gap-2 relative overflow-hidden group"
          >
            <span className="relative z-10 flex items-center gap-2">
              {theme === 'light' ? (
                <Sun size={16} className={prefersReducedMotion ? '' : 'animate-spin-slow'} />
              ) : theme === 'dark' ? (
                <Moon size={16} className={prefersReducedMotion ? '' : 'animate-spin-slow'} />
              ) : (
                <Laptop size={16} className={prefersReducedMotion ? '' : 'animate-spin-slow'} />
              )}
              {theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'}
            </span>
            <span className="absolute inset-0 bg-primary/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></span>
          </Button>
        </div>
      </div>

      {/* Enhanced Hero Section with Animations */}
      <main id="main-content" className="container mx-auto px-4 py-10 sm:py-12">
        <div
          className={cn(
            'grid grid-cols-1 items-center gap-8 md:grid-cols-2',
            prefersReducedMotion
              ? ''
              : 'transition-[opacity,transform] duration-1000 motion-reduce:transition-none',
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          )}
        >
          {/* Hero headline — one h1; scramble when motion OK; spacing kept tight — no reserve min-heights */}
          <div className="space-y-3">
            <div className="max-w-full">
              {desktopWideHero ? (
                <HeroDesktopCrossfadeHeadline prefersReducedMotion={prefersReducedMotion} />
              ) : (
                <h1 ref={heroHeadingRef} className={HERO_HEADLINE_CLASS}>
                  {HERO_PHRASES[0]}
                </h1>
              )}
            </div>
            <p className="text-fluid-base text-muted-foreground">
              Rhythm Guardian connects talented musicians with those seeking musical services for
              events, recordings, and performances.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link to="/signup?type=musician">
                <Button className="w-full sm:w-auto gap-2 transition-all hover:scale-105 relative overflow-hidden group">
                  <span className="relative z-10 flex items-center gap-2">
                    <Music
                      size={18}
                      className={prefersReducedMotion ? '' : 'animate-bounce-subtle'}
                    />
                    I'm a Musician
                  </span>
                  <span className="absolute inset-0 bg-primary/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></span>
                </Button>
              </Link>
              <Link to="/signup?type=hirer">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto gap-2 transition-all hover:scale-105 relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Users
                      size={18}
                      className={prefersReducedMotion ? '' : 'animate-bounce-subtle'}
                    />
                    I'm Looking to Hire
                  </span>
                  <span className="absolute inset-0 bg-primary/10 transform -skew-x-12 -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></span>
                </Button>
              </Link>
            </div>
            <div className="pt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <span>Already have an account?</span>
              <Link
                to="/login"
                className="text-primary hover:underline inline-flex items-center gap-1 group"
              >
                Login now{' '}
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Right column: logo orbit visual — desktop/tablet only (hidden on mobile) */}
          <div className="relative hidden md:block">
            <div
              className={`aspect-square max-w-[260px] md:max-w-md mx-auto rounded-full flex items-center justify-center ${prefersReducedMotion ? '' : 'animate-float'} group`}
              style={{
                background: `radial-gradient(circle, ${primaryColor}15, ${secondaryColor}10, transparent)`
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Audio Waveform Shield Logo */}
                <img 
                  src="/logo.svg" 
                  alt="Rhythm Guardian Logo"
                  className={`w-56 h-56 md:w-80 md:h-80 object-contain opacity-90 transition-transform duration-300 ${prefersReducedMotion ? '' : 'md:group-hover:scale-105'}`}
                  style={{
                    filter: `drop-shadow(0 0 28px ${primaryColor}50)`,
                  } as React.CSSProperties}
                />
              </div>

              {/* Orbiting elements with enhanced animations */}
              <div
                className={`absolute w-full h-full pointer-events-none hidden md:block ${prefersReducedMotion ? '' : 'animate-orbit-1'}`}
              >
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 p-3 bg-background rounded-full shadow-lg hover:scale-125 hover:bg-primary/20 transition-all duration-300 cursor-pointer"
                >
                  <Music
                    size={24}
                    className={`text-primary ${prefersReducedMotion ? '' : 'animate-bounce-subtle'}`}
                  />
                </div>
              </div>

              <div
                className={`absolute w-full h-full pointer-events-none hidden md:block ${prefersReducedMotion ? '' : 'animate-orbit-2'}`}
              >
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 p-3 bg-background rounded-full shadow-lg hover:scale-125 hover:bg-primary/20 transition-all duration-300 cursor-pointer"
                >
                  <Mic
                    size={24}
                    className={`text-primary ${prefersReducedMotion ? '' : 'animate-bounce-subtle'}`}
                  />
                </div>
              </div>

              <div
                className={`absolute w-full h-full pointer-events-none hidden md:block ${prefersReducedMotion ? '' : 'animate-orbit-3'}`}
              >
                <div
                  className="absolute top-1/2 right-0 -translate-y-1/2 p-3 bg-background rounded-full shadow-lg hover:scale-125 hover:bg-primary/20 transition-all duration-300 cursor-pointer"
                >
                  <Guitar
                    size={24}
                    className={`text-primary ${prefersReducedMotion ? '' : 'animate-bounce-subtle'}`}
                  />
                </div>
              </div>

              <div
                className={`absolute w-full h-full pointer-events-none hidden md:block ${prefersReducedMotion ? '' : 'animate-orbit-4'}`}
              >
                <div
                  className="absolute top-1/2 left-0 -translate-y-1/2 p-3 bg-background rounded-full shadow-lg hover:scale-125 hover:bg-primary/20 transition-all duration-300 cursor-pointer"
                >
                  <Headphones
                    size={24}
                    className={`text-primary ${prefersReducedMotion ? '' : 'animate-bounce-subtle'}`}
                  />
                </div>
              </div>

              {/* Particle effects - only show when motion is not reduced */}
              {!prefersReducedMotion && (
                <div className="particles-container pointer-events-none">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="particle"
                      style={
                        {
                          '--x': `${Math.random() * 100}%`,
                          '--y': `${Math.random() * 100}%`,
                          '--duration': `${3 + Math.random() * 10}s`,
                          '--delay': `${Math.random() * 5}s`,
                          '--size': `${3 + Math.random() * 5}px`,
                          '--color': `hsl(${210 + Math.random() * 60}, 70%, 60%)`,
                        } as React.CSSProperties
                      }
                    ></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rest of the component remains unchanged */}
        <div className="mt-24 mb-16 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent rounded-3xl blur-3xl pointer-events-none"></div>
          <h2 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Platform Features</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">Discover powerful tools designed to connect musicians and hirers seamlessly</p>

          <div className="relative px-12 py-4">
            <Carousel
              setApi={setApi}
              opts={{
                align: 'start',
                loop: true,
              }}
              className="w-full max-w-6xl mx-auto"
            >
              <CarouselContent className="-ml-4 md:-ml-6">
                <CarouselItem className="pl-4 md:pl-6 md:basis-1/2 lg:basis-1/3">
                  <div className="h-full group">
                    <div className="relative h-full rounded-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-primary/5 to-transparent pointer-events-none"></div>
                      <Card className="h-full border-0 bg-card/50 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-2">
                        <CardContent className="p-8 flex flex-col items-center justify-center h-full relative">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
                          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative z-10">
                            <Music size={36} className="text-white" />
                          </div>
                          <h3 className="text-xl font-bold mb-3 text-center relative z-10">
                            Showcase Your Talent
                          </h3>
                          <p className="text-muted-foreground text-center text-sm leading-relaxed relative z-10">
                            Create a profile highlighting your skills, experience, and musical style.
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CarouselItem>

                <CarouselItem className="pl-4 md:pl-6 md:basis-1/2 lg:basis-1/3">
                  <div className="h-full group">
                    <div className="relative h-full rounded-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-secondary/5 to-transparent"></div>
                      <Card className="h-full border-0 bg-card/50 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-2">
                        <CardContent className="p-8 flex flex-col items-center justify-center h-full relative">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-secondary/20 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative z-10">
                            <Users size={36} className="text-white" />
                          </div>
                          <h3 className="text-xl font-bold mb-3 text-center relative z-10">
                            Find Perfect Musicians
                          </h3>
                          <p className="text-muted-foreground text-center text-sm leading-relaxed relative z-10">
                            Browse profiles and find the right talent for your specific needs.
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CarouselItem>

                <CarouselItem className="pl-4 md:pl-6 md:basis-1/2 lg:basis-1/3">
                  <div className="h-full group">
                    <div className="relative h-full rounded-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-primary/5 to-transparent"></div>
                      <Card className="h-full border-0 bg-card/50 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-2">
                        <CardContent className="p-8 flex flex-col items-center justify-center h-full relative">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative z-10">
                            <Calendar size={36} className="text-white" />
                          </div>
                          <h3 className="text-xl font-bold mb-3 text-center relative z-10">Secure Bookings</h3>
                          <p className="text-muted-foreground text-center text-sm leading-relaxed relative z-10">
                            Manage bookings, payments and communications all in one place.
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CarouselItem>

                <CarouselItem className="pl-4 md:pl-6 md:basis-1/2 lg:basis-1/3">
                  <div className="h-full group">
                    <div className="relative h-full rounded-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-primary/5 to-transparent"></div>
                      <Card className="h-full border-0 bg-card/50 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-2">
                        <CardContent className="p-8 flex flex-col items-center justify-center h-full relative">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative z-10">
                            <MessageSquare size={36} className="text-white" />
                          </div>
                          <h3 className="text-xl font-bold mb-3 text-center relative z-10">
                            Integrated Messaging
                          </h3>
                          <p className="text-muted-foreground text-center text-sm leading-relaxed relative z-10">
                            Communicate directly with musicians or hirers through our built-in
                            messaging system.
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CarouselItem>

                <CarouselItem className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className="h-full">
                    <Card className="h-full border-primary/20 bg-background/80 backdrop-blur-sm hover:shadow-lg hover:scale-105 transition-all duration-300 transform-gpu">
                      <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 mx-auto">
                          <Star size={32} className="text-primary" />
                        </div>
                        <h3 className="text-xl font-medium mb-3 text-center">Reviews & Ratings</h3>
                        <p className="text-muted-foreground text-center">
                          Build your reputation with verified reviews from past collaborations.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              </CarouselContent>

              <div className="absolute -left-4 top-1/2 -translate-y-1/2">
                <CarouselPrevious className="-left-1 border-primary/20 bg-background/80 backdrop-blur-sm hover:bg-primary/10 hover:text-primary" />
              </div>
              <div className="absolute -right-4 top-1/2 -translate-y-1/2">
                <CarouselNext className="-right-1 border-primary/20 bg-background/80 backdrop-blur-sm hover:bg-primary/10 hover:text-primary" />
              </div>
            </Carousel>

            {/* Carousel Indicators */}
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: dotsCount }, (_, index) => (
                <button
                  key={index}
                  onClick={() => scrollTo(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${currentSlide === index
                    ? 'bg-primary scale-125'
                    : 'bg-primary/30 hover:bg-primary/50'
                    }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Featured Talent Section */}
        <div className="mt-24 mb-16 container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-8 px-4">
            <div>
              <h2 className="text-3xl font-bold mb-2">Featured Talent</h2>
              <p className="text-muted-foreground">Discover some of our top-rated musicians.</p>
            </div>
            <Link to="/hirer/search">
              <Button variant="ghost" className="group mt-4 md:mt-0">
                View All Musicians <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
            {featuredLoading &&
              [0, 1, 2].map((item) => (
                <Card
                  key={`featured-loading-${item}`}
                  className="overflow-hidden transition-all duration-300 border-primary/10"
                >
                  <div className="h-48 bg-muted animate-pulse" />
                  <CardContent className="p-5 space-y-3">
                    <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                      <div className="h-8 w-24 bg-muted rounded animate-pulse" />
                    </div>
                  </CardContent>
                </Card>
              ))}

            {!featuredLoading && !featuredError && featuredMusicians.length > 0 &&
              featuredMusicians.map((musician) => {
                const getRateDisplay = () => {
                  const basePrice =
                    typeof musician.basePrice === 'number'
                      ? musician.basePrice
                      : musician.basePrice !== undefined
                        ? parseFloat(String(musician.basePrice))
                        : undefined;
                  const hourlyRate =
                    typeof musician.hourlyRate === 'number'
                      ? musician.hourlyRate
                      : musician.hourlyRate !== undefined
                        ? parseFloat(String(musician.hourlyRate))
                        : undefined;
                  const minPrice =
                    typeof (musician as any).priceMin === 'number'
                      ? (musician as any).priceMin
                      : (musician as any).priceMin !== undefined
                        ? parseFloat(String((musician as any).priceMin))
                        : undefined;
                  const maxPrice =
                    typeof (musician as any).priceMax === 'number'
                      ? (musician as any).priceMax
                      : (musician as any).priceMax !== undefined
                        ? parseFloat(String((musician as any).priceMax))
                        : undefined;
                  const hasBase = basePrice !== undefined && Number.isFinite(basePrice);
                  const hasHourly = hourlyRate !== undefined && Number.isFinite(hourlyRate);
                  const hasMin = minPrice !== undefined && Number.isFinite(minPrice);
                  const hasMax = maxPrice !== undefined && Number.isFinite(maxPrice);

                  if (hasBase) {
                    return `${formatGHSWithSymbol(basePrice)} (Fixed)`;
                  }
                  if (hasHourly) {
                    return `${formatGHSWithSymbol(hourlyRate)}/hr`;
                  }
                  if (hasMin && hasMax) {
                    return `${formatGHSWithSymbol(minPrice)} - ${formatGHSWithSymbol(maxPrice)}`;
                  }
                  if (hasMin) {
                    return `${formatGHSWithSymbol(minPrice)}`;
                  }
                  if (hasMax) {
                    return `${formatGHSWithSymbol(maxPrice)}`;
                  }
                  return 'Rate on request';
                };

                const roleLabel =
                  musician.instruments?.[0] ||
                  musician.genres?.[0] ||
                  'Musician';
                const ratingValue =
                  typeof musician.rating === 'number' ? musician.rating.toFixed(1) : 'New';
                return (
                  <Card
                    key={musician.id}
                    className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group border-primary/10"
                  >
                    <div className="h-48 overflow-hidden relative">
                      <OptimizedImage
                        src={
                          musician.avatarUrl ||
                          '/placeholder.svg'
                        }
                        alt={musician.fullName}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        fallbackSrc="/placeholder.svg"
                      />
                      <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 text-xs font-medium shadow-sm">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        {ratingValue}
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <h3 className="font-bold text-lg mb-1">{musician.fullName}</h3>
                      <p className="text-muted-foreground text-sm mb-3">{roleLabel}</p>
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-primary">{getRateDisplay()}</p>
                        <Link to={`/hirer/search?q=${encodeURIComponent(musician.fullName)}`}>
                          <Button size="sm" variant="secondary" className="h-8">
                            View Profile
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

            {!featuredLoading && (featuredError || featuredMusicians.length === 0) && (
              <div className="col-span-full rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                No featured musicians available yet.
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Call to Action */}
      <div className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Join our community of musicians and hirers today and discover new opportunities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="w-full sm:w-auto transition-all hover:scale-105">
                Sign Up Now
              </Button>
            </Link>
            <Link to="/login">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto transition-all hover:scale-105"
              >
                Login
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row justify-between items-center">
          <div className="text-sm text-muted-foreground">
            © 2026 Rhythm Guardian. All rights reserved.
          </div>
          <div className="flex gap-6 mt-4 sm:mt-0">
            <Link
              to="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign Up
            </Link>
            <Link
              to="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
