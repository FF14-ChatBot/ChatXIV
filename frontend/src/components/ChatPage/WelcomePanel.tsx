import styles from './WelcomePanel.module.css';

const sampleSearches = [
  'What is BiS for Melee DPS in UCoB?',
  'Where is the NPC that I can purchase Egg of Elpis from?',
  'Please show me the mechs for Light Rampant in FRU!',
];

const welcomeMessage =
  'Hello, I am Mammetbot! Welcome to ChatXIV. If you have a question about FFXIV click in the message box below, type in the question, click on the send button, and I will do my best to answer within my capabilities!';

interface WelcomePanelProps {
  onSearchSelect: (query: string) => void;
}

export function WelcomePanel({ onSearchSelect }: WelcomePanelProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.welcomeBox}>
        <p className={styles.welcomeText}>{welcomeMessage}</p>
      </div>

      <div className={styles.searchGrid}>
        {sampleSearches.map((search, index) => (
          <button key={index} className={styles.searchCard} onClick={() => onSearchSelect(search)}>
            <p className={styles.searchCardText}>{search}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
