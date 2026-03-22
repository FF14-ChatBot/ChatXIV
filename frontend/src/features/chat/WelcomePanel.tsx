import { useCallback, useEffect, useMemo, useState } from 'react';
import { MammetLucideMark } from '../../components/MammetLucideMark/MammetLucideMark';
import { useStarterPromptSlides } from '../../hooks/useStarterPromptSlides';
import { expandStarterPromptSlidesOnePerSlide } from '../../lib/starterPrompts/expandStarterPromptSlidesOnePerSlide';
import styles from './WelcomePanel.module.css';

const CAROUSEL_INTERVAL_MS = 6000;
/** Matches `WelcomePanel.module.css` — below this width, prompt row is a single column. */
const ONE_CARD_PER_SLIDE_MQ = '(max-width: 767px)';

interface WelcomePanelProps {
  readonly onPromptSubmit: (query: string) => void;
}

export function WelcomePanel({ onPromptSubmit }: WelcomePanelProps) {
  const slides = useStarterPromptSlides();
  const [slideIndex, setSlideIndex] = useState(0);
  const [oneCardPerSlide, setOneCardPerSlide] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(ONE_CARD_PER_SLIDE_MQ).matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const mq = window.matchMedia(ONE_CARD_PER_SLIDE_MQ);
    const sync = () => setOneCardPerSlide(mq.matches);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const displaySlides = useMemo(
    () => (oneCardPerSlide ? expandStarterPromptSlidesOnePerSlide(slides) : slides),
    [oneCardPerSlide, slides]
  );

  useEffect(() => {
    setSlideIndex(0);
  }, [displaySlides]);

  useEffect(() => {
    if (displaySlides.length <= 1) return undefined;
    const id = window.setInterval(() => {
      setSlideIndex((i) => (i + 1) % displaySlides.length);
    }, CAROUSEL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [displaySlides.length]);

  const goToSlide = useCallback((index: number) => {
    setSlideIndex(index);
  }, []);

  const active = displaySlides[slideIndex];
  if (!active) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.hero} aria-labelledby="welcome-hero-title">
        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.heroGlow} />
          <div className={styles.heroAvatar}>
            <MammetLucideMark className={styles.heroBotIcon} />
          </div>
        </div>
        <div className={styles.heroText}>
          <h1 id="welcome-hero-title" className={styles.heroTitle}>
            MammetBot
          </h1>
          <p className={styles.heroTagline}>
            Hello! I&apos;m MammetBot, and welcome to ChatXIV. Ask me anything about FFXIV and
            I&apos;ll do my best to help.
          </p>
          <p className={styles.heroHint}>
            Type in the box below or tap a suggestion, then hit send.
          </p>
        </div>
      </div>

      <div
        className={styles.carousel}
        role="region"
        aria-roledescription="carousel"
        aria-label="Suggested questions"
      >
        <div key={active.id} className={styles.slide} aria-live="polite">
          <div className={styles.promptRow}>
            {active.items.map((item, index) => (
              <button
                key={`${active.id}-${index}`}
                type="button"
                className={styles.suggestionCard}
                title={item.prompt}
                onClick={() => onPromptSubmit(item.prompt)}
              >
                <span className={styles.cardEmoji} aria-hidden>
                  {item.emoji}
                </span>
                <span className={styles.cardCategory}>{item.category}</span>
                <span className={styles.cardPrompt}>{item.prompt}</span>
              </button>
            ))}
          </div>
        </div>

        {displaySlides.length > 1 ? (
          <div className={styles.dots} role="tablist" aria-label="Suggested question sets">
            {displaySlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={index === slideIndex}
                aria-label={`Show suggested questions set ${index + 1}`}
                className={index === slideIndex ? styles.dotActive : styles.dot}
                onClick={() => goToSlide(index)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
