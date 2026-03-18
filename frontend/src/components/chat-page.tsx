import { Send } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useState } from 'react';

const sampleSearches = [
  "What is BiS for Melee DPS in UCoB?",
  "Where is the NPC that I can purchase Egg of Elpis from?",
  "Please show me the mechs for Light Rampant in FRU!"
];

const welcomeMessage = "Hello, I am Mammetbot! Welcome to ChatXIV. If you have a question about FFXIV click in the message box below, type in the question, click on the send button, and I will do my best to answer within my capabilities!";

interface Message {
  id: string;
  text: string;
  role: 'user' | 'assistant';
}

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      role: 'user'
    };
    
    setMessages([...messages, newMessage]);
    setInputValue('');
    
    // Simulate bot response
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm MammetBot! This is a demo response. In a real implementation, I would provide helpful information about FFXIV!",
        role: 'assistant'
      };
      setMessages(prev => [...prev, botMessage]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Message List - Centered when empty, top-aligned with messages */}
      <div className={`flex-1 overflow-auto p-4 ${hasMessages ? '' : 'flex items-center justify-center'}`}>
        {!hasMessages ? (
          <div className="w-full max-w-5xl space-y-4">
            {/* Welcome message box */}
            <div className="p-6 border-2 border-primary/20 rounded-lg bg-card/60 backdrop-blur-sm shadow-sm">
              <p className="text-sm text-foreground/90 text-center">{welcomeMessage}</p>
            </div>

            {/* Sample search options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sampleSearches.map((search, index) => (
                <button
                  key={index}
                  className="p-4 border-2 border-primary/20 rounded-lg bg-card/60 backdrop-blur-sm hover:bg-card/80 hover:border-primary/40 transition-all text-left shadow-sm"
                  onClick={() => setInputValue(search)}
                >
                  <p className="text-sm text-foreground/90">{search}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-5xl mx-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary/20 ml-auto max-w-[80%]'
                    : 'bg-card/60 backdrop-blur-sm mr-auto max-w-[80%]'
                }`}
              >
                <p className="text-sm text-foreground/90">{message.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="flex-shrink-0 border-t bg-background/80 backdrop-blur-sm p-4">
        <div className="flex items-center gap-2 max-w-5xl mx-auto">
          <Input
            type="text"
            placeholder="Ask me anything about FFXIV!"
            className="flex-1"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <Button size="icon" onClick={handleSend} aria-label="Send message">
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}