import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Plus, Trash2 } from 'lucide-react';

interface MindFlowProps {
  tasks: string[];
  onTasksChange: (tasks: string[]) => void;
}

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

type SpeechRecognitionResultList = {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

type SpeechRecognitionResult = {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
}

type SpeechRecognitionErrorEvent = {
  error: 'no-speech' | 'audio-capture' | 'not-allowed' | 'network' | string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (event: Event) => void;
  onend: (event: Event) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function MindFlow({ tasks, onTasksChange }: MindFlowProps) {
  const [phrases, setPhrases] = useState<string[]>(() => {
    const savedPhrases = localStorage.getItem('hippoplan_mindflow_phrases');
    return savedPhrases ? JSON.parse(savedPhrases) : tasks.length > 0 ? tasks : [''];
  });

  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const phrasesRef = useRef<string[]>([]);
  const hasSpokenRef = useRef(false);

  // Keep phrasesRef in sync with phrases state
  useEffect(() => {
    phrasesRef.current = phrases;
  }, [phrases]);

  // Persist phrases to localStorage
  useEffect(() => {
    localStorage.setItem('hippoplan_mindflow_phrases', JSON.stringify(phrases));
  }, [phrases]);

  // Sync tasks with parent
  useEffect(() => {
    const nonEmptyPhrases = phrases.filter(phrase => phrase.trim() !== '');
    if (nonEmptyPhrases.length > 0 || tasks.length > 0) {
      onTasksChange(nonEmptyPhrases);
    }
  }, [phrases, onTasksChange]);

  // Initialize from tasks if they change externally
  useEffect(() => {
    if (tasks.length > 0 && !phrases.some(p => p.trim() !== '')) {
      setPhrases(tasks);
    }
  }, [tasks]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startTimer = () => {
    setTimeLeft(120); // 2 minutes in seconds
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimeLeft(null);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startListening = async () => {
    setError(null);
    hasSpokenRef.current = false;
    startTimer();
    console.log('=== Speech Recognition Debug Log ===');
    console.log('1. Starting recognition process');
    
    try {
      if (!recognitionRef.current) {
        recognitionRef.current = new (window as any).webkitSpeechRecognition();
      }

      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            hasSpokenRef.current = true;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          console.log('Final transcript:', finalTranscript);
          setPhrases(prev => {
            const newPhrases = [...prev];
            // Find the first empty field or add to the end
            const emptyIndex = newPhrases.findIndex(p => !p.trim());
            if (emptyIndex !== -1) {
              newPhrases[emptyIndex] = finalTranscript.trim();
            } else {
              newPhrases.push(finalTranscript.trim());
            }
            return newPhrases;
          });
        }

        setInterimTranscript(interimTranscript);
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Recognition error:', event);
        if (event.error === 'not-allowed') {
          setError('Microphone access was denied. Please allow microphone access in your browser settings and try again.');
        } else if (event.error === 'no-speech') {
          setError('No speech was detected. Please try speaking again.');
        } else if (event.error === 'audio-capture') {
          setError('No microphone was found. Please ensure your microphone is connected and working.');
        } else if (event.error === 'network') {
          setError('Network error occurred. Please ensure you are using HTTPS and have a stable internet connection.');
        } else {
          setError(`Speech recognition error: ${event.error}. Please try again.`);
        }
        stopListening();
      };

      recognitionRef.current.onstart = () => {
        console.log('Recognition started');
        setIsListening(true);
        setError(null);
      };

      recognitionRef.current.onend = () => {
        console.log('Recognition ended');
        if (isListening) {
          recognitionRef.current?.start();
        } else {
          // Clean up empty fields only when stopping
          setPhrases(prev => prev.filter(phrase => phrase.trim()));
        }
      };

      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      setError('Could not start speech recognition. Please ensure you are using a supported browser.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      stopTimer();
      setInterimTranscript('');
      // Clean up empty fields
      setPhrases(prev => prev.filter(phrase => phrase.trim()));
    }
  };

  const addEmptyField = () => {
    setPhrases(prev => [...prev, '']);
  };

  const updateField = (index: number, text: string) => {
    setPhrases(prev => {
      const newPhrases = [...prev];
      newPhrases[index] = text;
      return newPhrases;
    });
  };

  const removePhrase = (index: number) => {
    setPhrases(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Mind Flow</h2>
        <p className="text-sm sm:text-base text-gray-600 space-y-2">
          <span className="block">Take 2 minutes to say all of the tasks you can think of that you want to work on this week.</span>
          <span className="block">Each task will be captured in a new field.</span>
          <span className="block">Don't worry about getting everything perfect - you can edit the tasks when you're done.</span>
        </p>
      </div>

      <div className="space-y-3">
        {phrases.map((phrase, index) => (
          <div key={`phrase-${index}`} className="flex gap-2">
            <input
              type="text"
              value={phrase || ''}
              onChange={(e) => {
                const text = e.target.value;
                updateField(index, text);
              }}
              className="flex-1 p-3 sm:p-2 text-base sm:text-sm border rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Speak or type your task..."
            />
            <button
              onClick={() => removePhrase(index)}
              className="p-3 sm:p-2 text-red-500 hover:text-red-600 touch-manipulation"
              title="Remove task"
            >
              <Trash2 className="w-6 h-6 sm:w-5 sm:h-5" />
            </button>
          </div>
        ))}

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 mt-4">
          <button
            onClick={addEmptyField}
            className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 active:bg-purple-100 touch-manipulation"
          >
            <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
            Add New Task
          </button>

          <div className="flex flex-col items-center gap-2">
            {timeLeft !== null && (
              <div className={`text-lg font-medium text-teal-600`}>
                {formatTime(timeLeft)}
              </div>
            )}
            <button
              onClick={isListening ? stopListening : startListening}
              className={`flex items-center justify-center gap-2 px-4 py-3 sm:py-2 text-white rounded-lg transition-colors touch-manipulation w-full ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 active:bg-red-700' 
                  : 'bg-purple-500 hover:bg-purple-600 active:bg-purple-700'
              }`}
              title={isListening ? 'Stop listening' : 'Start listening'}
              disabled={!!error}
            >
              {isListening ? (
                <>
                  <MicOff className="w-5 h-5 sm:w-4 sm:h-4" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 sm:w-4 sm:h-4" />
                  Start Recording
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {isListening && interimTranscript && (
        <div className="mt-4 p-3 sm:p-2 bg-purple-100 text-purple-700 rounded-md text-sm sm:text-base">
          Listening... <span className="italic">{interimTranscript}</span>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 sm:p-2 bg-red-100 text-red-700 rounded-md text-sm sm:text-base">
          {error}
        </div>
      )}
    </div>
  );
}