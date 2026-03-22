import { useCallback, useEffect, useState } from 'react';
import { Bot } from 'lucide-react';
import { useStarterPromptSlides } from '../../hooks/useStarterPromptSlides';
import styles from './WelcomePanel.module.css';

const CAROUSEL_INTERVAL_MS = 6000;

interface WelcomePanelProps {
  readonly onPromptSubmit: (query: string) => void;
}

export function WelcomePanel({ onPromptSubmit }: WelcomePanelProps) {
  const slides = useStarterPromptSlides();
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    setSlideIndex(0);
  }, [slides]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const id = window.setInterval(() => {
      setSlideIndex((i) => (i + 1) % slides.length);
    }, CAROUSEL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [slides.length]);

  const goToSlide = useCallback((index: number) => {
    setSlideIndex(index);
  }, []);

  const active = slides[slideIndex];
  if (!active) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.hero} aria-labelledby="welcome-hero-title">
        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.heroGlow} />
          <div className={styles.heroAvatar}>
            <Bot className={styles.heroBotIcon} strokeWidth={1.75} aria-hidden />
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

        {slides.length > 1 ? (
          <div className={styles.dots} role="tablist" aria-label="Suggested question sets">
            {slides.map((slide, index) => (
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
