import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  Alert,
  Animated,
  TextInput,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface GamesHubProps {
  userId: Id<"users">;
  onClose: () => void;
}

type GameDef = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  implemented?: boolean;
};

const games: GameDef[] = [
  { id: 'reaction', name: 'Wait for Green', emoji: '⚡', color: '#10b981', description: 'Test reaction time', implemented: true },
  { id: 'breathing', name: 'Breath Match', emoji: '💨', color: '#06b6d4', description: 'Match breathing rhythm', implemented: true },
  { id: 'memory', name: 'Memory Path', emoji: '🧠', color: '#a855f7', description: 'Remember sequences', implemented: true },
  { id: 'balance', name: 'Balance', emoji: '🎯', color: '#f97316', description: 'Keep centered', implemented: true },

  // Restored from old repo (most were placeholders there as well)
  { id: 'spot-difference', name: 'Spot Difference', emoji: '🔍', color: '#6366f1', description: 'Find changes', implemented: true },
  { id: 'sequence-recall', name: 'Sequence Recall', emoji: '📋', color: '#14b8a6', description: 'Remember numbers', implemented: true },
  { id: 'focus-frenzy', name: 'Focus Frenzy', emoji: '👆', color: '#ec4899', description: 'Click targets fast', implemented: true },
  { id: 'wave-rider', name: 'Wave Rider', emoji: '🌊', color: '#3b82f6', description: 'Breathe with waves', implemented: true },
  { id: 'focus-shift', name: 'Focus Shift', emoji: '🔄', color: '#06b6d4', description: 'Switch tasks' },
  { id: 'visual-filter', name: 'Visual Filter', emoji: '👁️', color: '#8b5cf6', description: 'Find patterns', implemented: true },
  { id: 'task-switcher', name: 'Task Switcher', emoji: '📚', color: '#6366f1', description: 'Quick switching', implemented: true },
  { id: 'attention-trainer', name: 'Attention Trainer', emoji: '👆', color: '#ec4899', description: 'Click targets', implemented: true },
  { id: 'concentration-challenge', name: 'Concentration', emoji: '⏰', color: '#f59e0b', description: 'Focus longer', implemented: true },
  { id: 'breathe-mountain', name: 'Breathe Mountain', emoji: '⛰️', color: '#10b981', description: 'Mountain breathing', implemented: true },
  { id: 'relaxing-ripples', name: 'Relaxing Ripples', emoji: '💧', color: '#06b6d4', description: 'Create ripples' },
  { id: 'calm-colors', name: 'Calm Colors', emoji: '🎨', color: '#ec4899', description: 'Color breathing' },
  { id: 'soothing-soundscape', name: 'Soundscape', emoji: '🎵', color: '#14b8a6', description: 'Peaceful sounds' },
  { id: 'mindful-moments', name: 'Mindful Moments', emoji: '🎯', color: '#6366f1', description: 'Present moment' },
  { id: 'memory-matrix-2', name: 'Memory Matrix', emoji: '🔲', color: '#a855f7', description: 'Grid memory' },
  { id: 'word-scramble', name: 'Word Scramble', emoji: '🔀', color: '#f97316', description: 'Unscramble words' },
  { id: 'math-bingo-2', name: 'Math Bingo', emoji: '🔢', color: '#10b981', description: 'Solve math' },
  { id: 'storyteller-2', name: 'Storyteller', emoji: '📖', color: '#f59e0b', description: 'Recall story' },
  { id: 'anagram-challenge', name: 'Anagram', emoji: '✍️', color: '#3b82f6', description: 'Solve anagrams' },
  { id: 'finger-tapping', name: 'Finger Tap', emoji: '👋', color: '#ec4899', description: 'Tap sequence' },
  { id: 'reaction-time-challenge', name: 'Reaction Time', emoji: '⏱️', color: '#10b981', description: 'React quickly' },
  { id: 'maze-runner-2', name: 'Maze Runner', emoji: '🧭', color: '#a855f7', description: 'Navigate maze' },
  { id: 'rhythm-tap-2', name: 'Rhythm Tap', emoji: '🎵', color: '#3b82f6', description: 'Tap to beat' },
  { id: 'balance-challenge', name: 'Balance Challenge', emoji: '⚖️', color: '#f97316', description: 'Virtual balance' },
  { id: 'mindful-walking', name: 'Mindful Walk', emoji: '👣', color: '#3b82f6', description: 'Walking practice' },
];

export default function GamesHub({ userId, onClose }: GamesHubProps) {
  const router = useRouter();
  const user = useQuery(api.users.getUserById, { userId });
  const gamesProgress = useQuery(api.wellness.getGamesProgress, { userId }) || [];
  const completeGameSession = useMutation(api.wellness.completeGameSession);

  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const playsToday = gamesProgress.reduce((acc: number, p: any) => {
    if (p.lastResetDate === today) return acc + (p.playsToday ?? 0);
    return acc;
  }, 0);
  const isPro =
    user?.subscriptionStatus === 'pro' ||
    user?.isPremium ||
    user?.isAdmin ||
    user?.role === 'admin' ||
    user?.role === 'super_admin';
  const remainingPlays = isPro ? Infinity : Math.max(0, 2 - playsToday);

  const handleGameSelect = (gameId: string) => {
    if (!isPro && playsToday >= 2) {
      setShowUpgrade(true);
      return;
    }
    setActiveGame(gameId);
  };

  const activeGameDef = useMemo(() => games.find((g) => g.id === activeGame) ?? null, [activeGame]);

  const handleGameComplete = async (result: { gameId: string; gameName: string; score?: number; reactionMs?: number }) => {
    try {
      await completeGameSession({
        userId,
        gameId: result.gameId,
        gameName: result.gameName,
        score: result.score,
        reactionMs: result.reactionMs,
        date: today,
      });
    } catch (e) {
      if (!isPro) {
        setShowUpgrade(true);
      } else {
        Alert.alert('Error', 'Something went wrong saving the result.');
      }
    } finally {
      setTimeout(() => setActiveGame(null), 800);
    }
  };

  return (
    <Modal visible={true} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>🎮 Mind Games Hub</Text>
            <Text style={styles.headerSubtitle}>Train focus & mindfulness</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeGame === 'reaction' ? (
            <ReactionTestGame
              onBack={() => setActiveGame(null)}
              onComplete={(reactionMs) => handleGameComplete({ gameId: 'reaction', gameName: 'Wait for Green', reactionMs, score: 0 })}
            />
          ) : activeGame === 'breathing' ? (
            <BreathingGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'breathing', gameName: 'Breath Match', score })}
            />
          ) : activeGame === 'memory' ? (
            <MemoryGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'memory', gameName: 'Memory Path', score })}
            />
          ) : activeGame === 'balance' ? (
            <BalanceGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'balance', gameName: 'Balance', score })}
            />
          ) : activeGame === 'spot-difference' ? (
            <SpotDifferenceGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'spot-difference', gameName: 'Spot Difference', score })}
            />
          ) : activeGame === 'sequence-recall' ? (
            <SequenceRecallGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'sequence-recall', gameName: 'Sequence Recall', score })}
            />
          ) : activeGame === 'focus-frenzy' ? (
            <FocusFrenzyGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'focus-frenzy', gameName: 'Focus Frenzy', score })}
            />
          ) : activeGame === 'wave-rider' ? (
            <WaveRiderGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'wave-rider', gameName: 'Wave Rider', score })}
            />
          ) : activeGame === 'visual-filter' ? (
            <VisualFilterGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'visual-filter', gameName: 'Visual Filter', score })}
            />
          ) : activeGame === 'task-switcher' ? (
            <TaskSwitcherGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'task-switcher', gameName: 'Task Switcher', score })}
            />
          ) : activeGame === 'attention-trainer' ? (
            <AttentionTrainerGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'attention-trainer', gameName: 'Attention Trainer', score })}
            />
          ) : activeGame === 'concentration-challenge' ? (
            <ConcentrationChallengeGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'concentration-challenge', gameName: 'Concentration', score })}
            />
          ) : activeGame === 'breathe-mountain' ? (
            <BreatheMountainGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'breathe-mountain', gameName: 'Breathe Mountain', score })}
            />
          ) : activeGameDef ? (
            <ComingSoonGame
              game={activeGameDef}
              remainingPlays={remainingPlays}
              onBack={() => setActiveGame(null)}
              onComplete={() =>
                handleGameComplete({
                  gameId: activeGameDef.id,
                  gameName: activeGameDef.name,
                  score: 0,
                })
              }
            />
          ) : (
            <>
              <View style={styles.limitRow}>
                <Text style={styles.limitText}>
                  {isPro ? 'Premium: unlimited games' : `Free: ${Math.min(2, playsToday)}/2 games today`}
                </Text>
              </View>
              <View style={styles.gamesGrid}>
                {games.map((game) => (
                  <TouchableOpacity
                    key={game.id}
                    onPress={() => handleGameSelect(game.id)}
                    style={[styles.gameCard, { backgroundColor: game.color }]}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.gameEmoji}>{game.emoji}</Text>
                    <Text style={styles.gameName}>{game.name}</Text>
                    <Text style={styles.gameDescription}>{game.description}</Text>
                    {!game.implemented && (
                      <View style={styles.soonPill}>
                        <Text style={styles.soonPillText}>Coming soon</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </View>

      <ProUpgradeModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => {
          setShowUpgrade(false);
          onClose();
          router.push('/premium');
        }}
        title="Upgrade to Pro"
        message="Free users can play 2 games per day. Upgrade to Pro for unlimited games and progress tracking."
        upgradeLabel="View Pro Plans"
      />
    </Modal>
  );
}

function ReactionTestGame({ onBack, onComplete }: { onBack: () => void; onComplete: (reactionMs: number) => void }) {
  const [state, setState] = useState<'ready' | 'waiting' | 'now'>('ready');
  const [message, setMessage] = useState('Tap Start to begin');
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => () => timerRef.current && clearTimeout(timerRef.current), []);

  const startGame = () => {
    setState('waiting');
    setMessage('Wait for green...');
    setReactionTime(null);
    const delay = 1000 + Math.random() * 2000;
    timerRef.current = setTimeout(() => {
      setState('now');
      setMessage('Tap Now!');
      startTimeRef.current = Date.now();
    }, delay);
  };

  const handleTap = () => {
    if (state === 'waiting') {
      timerRef.current && clearTimeout(timerRef.current);
      setState('ready');
      setMessage('Too soon! Try again');
      return;
    }
    if (state === 'now' && startTimeRef.current) {
      const reaction = Math.round(Date.now() - startTimeRef.current);
      setReactionTime(reaction);
      setState('ready');
      setMessage(`Reaction: ${reaction}ms`);
      onComplete(reaction);
    }
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleTap} activeOpacity={0.9} style={[styles.reactionBox, { backgroundColor: state === 'now' ? '#86efac' : state === 'waiting' ? '#fef08a' : '#f3f4f6' }]}>
        <Text style={styles.reactionMessage}>{message}</Text>
        {reactionTime !== null && <Text style={styles.reactionTime}>Your reaction: {reactionTime}ms</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={startGame} style={[styles.gameButton, { backgroundColor: '#10b981' }]}>
        <Text style={styles.gameButtonText}>Start</Text>
      </TouchableOpacity>
    </View>
  );
}

function BreathingGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [cycle, setCycle] = useState(0);
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale' | 'pause'>('inhale');
  const [isPlaying, setIsPlaying] = useState(false);
  const phaseTimerRef = useRef<any>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => () => phaseTimerRef.current && clearTimeout(phaseTimerRef.current), []);

  const startBreathingCycle = (nextCycle: number) => {
    setPhase('inhale');
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.5, duration: 2000, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.0, duration: 2000, useNativeDriver: true }),
    ]).start();

    phaseTimerRef.current = setTimeout(() => {
      setPhase('hold');
      phaseTimerRef.current = setTimeout(() => {
        setPhase('exhale');
        phaseTimerRef.current = setTimeout(() => {
          setPhase('pause');
          phaseTimerRef.current = setTimeout(() => {
            setCycle(nextCycle);
            if (nextCycle >= 5) {
              setIsPlaying(false);
              onComplete(nextCycle);
            } else {
              startBreathingCycle(nextCycle + 1);
            }
          }, 800);
        }, 1600);
      }, 800);
    }, 1600);
  };

  const start = () => {
    setCycle(1);
    setIsPlaying(true);
    startBreathingCycle(1);
  };

  const label = phase === 'inhale' ? 'Breathe In' : phase === 'hold' ? 'Hold' : phase === 'exhale' ? 'Breathe Out' : 'Pause';

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Breath Match</Text>
      <Text style={styles.gameSubtitle}>Complete 5 breathing cycles</Text>
      <Text style={styles.limitText}>Cycle: {cycle}/5</Text>

      <View style={styles.breathingContainer}>
        <Animated.View style={[styles.breathingCircle, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.gameEmoji}>💨</Text>
        </Animated.View>
        <Text style={styles.breathingPhase}>{label}</Text>
      </View>

      {!isPlaying ? (
        <TouchableOpacity onPress={start} style={[styles.gameButton, { backgroundColor: '#06b6d4' }]}>
          <Text style={styles.gameButtonText}>Start</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => { setIsPlaying(false); onComplete(cycle); }} style={[styles.gameButton, { backgroundColor: '#9ca3af' }]}>
          <Text style={styles.gameButtonText}>Stop</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function MemoryGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [isShowing, setIsShowing] = useState(false);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [activeColor, setActiveColor] = useState<number | null>(null);
  const colors = ['#ef4444', '#3b82f6', '#10b981', '#eab308'];

  const showSequence = (seq: number[]) => {
    setIsShowing(true);
    let index = 0;
    const interval = setInterval(() => {
      if (index < seq.length) {
        setActiveColor(seq[index]);
        setTimeout(() => {
          setActiveColor(null);
          index++;
          if (index >= seq.length) {
            clearInterval(interval);
            setIsShowing(false);
          }
        }, 400);
      }
    }, 650);
  };

  const generate = (nextLevel: number) => {
    const newSeq: number[] = [];
    for (let i = 0; i < nextLevel + 2; i++) newSeq.push(Math.floor(Math.random() * 4));
    setSequence(newSeq);
    setUserSequence([]);
    showSequence(newSeq);
  };

  const start = () => {
    setLevel(1);
    setGameOver(false);
    generate(1);
  };

  const press = (idx: number) => {
    if (isShowing || gameOver) return;
    const next = [...userSequence, idx];
    setUserSequence(next);
    if (next[next.length - 1] !== sequence[next.length - 1]) {
      setGameOver(true);
      onComplete(level - 1);
      return;
    }
    if (next.length === sequence.length) {
      const nextLevel = level + 1;
      setLevel(nextLevel);
      setTimeout(() => generate(nextLevel), 700);
    }
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Memory Path</Text>
      <Text style={styles.gameSubtitle}>Repeat the sequence</Text>
      <Text style={styles.limitText}>Level: {level}</Text>
      {sequence.length === 0 && !gameOver && (
        <TouchableOpacity onPress={start} style={[styles.gameButton, { backgroundColor: '#a855f7' }]}>
          <Text style={styles.gameButtonText}>Start</Text>
        </TouchableOpacity>
      )}
      <View style={styles.memoryGrid}>
        {colors.map((c, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => press(i)}
            disabled={isShowing || gameOver}
            style={[
              styles.memoryColor,
              { backgroundColor: c },
              activeColor === i && styles.memoryColorActive,
              (isShowing || gameOver) && styles.memoryColorDisabled,
            ]}
          />
        ))}
      </View>
      {gameOver && <Text style={styles.warningText}>Game Over! Score: {Math.max(0, level - 1)}</Text>}
      {isShowing && <Text style={styles.limitText}>Watch...</Text>}
    </View>
  );
}

function BalanceGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [balance, setBalance] = useState(0);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const timerRef = useRef<any>(null);
  const driftRef = useRef<any>(null);

  useEffect(() => () => { timerRef.current && clearInterval(timerRef.current); driftRef.current && clearInterval(driftRef.current); }, []);

  const end = (finalTime: number) => {
    setIsPlaying(false);
    setGameOver(true);
    timerRef.current && clearInterval(timerRef.current);
    driftRef.current && clearInterval(driftRef.current);
    onComplete(Math.floor(finalTime * 10));
  };

  const start = () => {
    setBalance(0);
    setTime(0);
    setGameOver(false);
    setIsPlaying(true);
    driftRef.current = setInterval(() => {
      setBalance((prev) => Math.max(-50, Math.min(50, prev + (Math.random() - 0.5) * 2)));
    }, 50);
    timerRef.current = setInterval(() => {
      setTime((prev) => {
        const next = prev + 1;
        if (next >= 30) { end(next); return 30; }
        return next;
      });
    }, 1000);
  };

  const adjust = (dir: 'left' | 'right') => {
    if (!isPlaying || gameOver) return;
    setBalance((prev) => {
      const next = Math.max(-50, Math.min(50, prev + (dir === 'left' ? -3 : 3)));
      if (Math.abs(next) >= 45) end(time);
      return next;
    });
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Balance</Text>
      <Text style={styles.gameSubtitle}>Keep the ball centered</Text>
      {!isPlaying && !gameOver && (
        <TouchableOpacity onPress={start} style={[styles.gameButton, { backgroundColor: '#f97316' }]}>
          <Text style={styles.gameButtonText}>Start</Text>
        </TouchableOpacity>
      )}
      <View style={styles.balanceBar}>
        <View style={[styles.balanceBall, { left: `${50 + balance}%` }]} />
      </View>
      <Text style={styles.limitText}>Time: {time}s</Text>
      {isPlaying && (
        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={() => adjust('left')} style={[styles.gameButton, { backgroundColor: '#3b82f6', flex: 1 }]}>
            <Text style={styles.gameButtonText}>← Left</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => adjust('right')} style={[styles.gameButton, { backgroundColor: '#3b82f6', flex: 1 }]}>
            <Text style={styles.gameButtonText}>Right →</Text>
          </TouchableOpacity>
        </View>
      )}
      {gameOver && <Text style={styles.warningText}>Done! Score: {Math.floor(time * 10)}</Text>}
    </View>
  );
}

function SpotDifferenceGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const EMOJIS = ['🍎', '🍊', '🍇', '🍓', '🍌', '🥝', '🍍', '🍒'];
  const [round, setRound] = useState(1);
  const [targetIndex, setTargetIndex] = useState(0);
  const [grid, setGrid] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<string>('Find the odd one out!');

  const startRound = useMemo(() => {
    return () => {
      const base = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      let diff = base;
      while (diff === base) diff = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      const idx = Math.floor(Math.random() * 16);
      const g = Array.from({ length: 16 }, () => base);
      g[idx] = diff;
      setGrid(g);
      setTargetIndex(idx);
      setStatus(`Round ${round}/5: Tap the different emoji`);
    };
  }, [round]);

  useEffect(() => {
    startRound();
  }, [startRound]);

  const tap = (idx: number) => {
    if (idx === targetIndex) {
      setScore((s) => s + 1);
      if (round >= 5) {
        onComplete(score + 1);
      } else {
        setRound((r) => r + 1);
      }
    } else {
      setStatus('Wrong — try again!');
    }
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Spot Difference</Text>
      <Text style={styles.gameSubtitle}>{status}</Text>
      <Text style={styles.limitText}>Score: {score}</Text>
      <View style={styles.grid16}>
        {grid.map((e, i) => (
          <TouchableOpacity key={i} style={styles.gridCell} onPress={() => tap(i)} activeOpacity={0.8}>
            <Text style={styles.gridEmoji}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function SequenceRecallGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [phase, setPhase] = useState<'show' | 'input'>('show');
  const [sequence, setSequence] = useState('');
  const [input, setInput] = useState('');
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const timerRef = useRef<any>(null);

  const makeSequence = () => {
    const len = 4 + round; // 5..7
    const s = Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');
    setSequence(s);
    setInput('');
    setPhase('show');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPhase('input'), 2000);
  };

  useEffect(() => {
    makeSequence();
    return () => timerRef.current && clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const submit = () => {
    const ok = input.trim() === sequence;
    const nextScore = ok ? score + 1 : score;
    setScore(nextScore);
    if (round >= 3) {
      onComplete(nextScore);
      return;
    }
    setRound((r) => r + 1);
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Sequence Recall</Text>
      <Text style={styles.gameSubtitle}>Round {round}/3</Text>

      {phase === 'show' ? (
        <View style={styles.bigCard}>
          <Text style={styles.bigCardTitle}>Memorize</Text>
          <Text style={styles.bigCardValue}>{sequence}</Text>
          <Text style={styles.limitText}>Hiding in 2s…</Text>
        </View>
      ) : (
        <View style={styles.bigCard}>
          <Text style={styles.bigCardTitle}>Type the sequence</Text>
          <TextInput
            value={input}
            onChangeText={setInput}
            keyboardType="number-pad"
            style={styles.inputBox}
            placeholder="Enter numbers"
          />
          <TouchableOpacity style={[styles.gameButton, { backgroundColor: '#14b8a6' }]} onPress={submit}>
            <Text style={styles.gameButtonText}>Submit</Text>
          </TouchableOpacity>
          <Text style={styles.limitText}>Score: {score}</Text>
        </View>
      )}
    </View>
  );
}

function FocusFrenzyGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [timeLeft, setTimeLeft] = useState(10);
  const [score, setScore] = useState(0);
  const [pos, setPos] = useState({ x: 40, y: 80 });
  const intervalRef = useRef<any>(null);

  const randomize = () => {
    const x = 20 + Math.random() * (width - 120);
    const y = 40 + Math.random() * 300;
    setPos({ x, y });
  };

  useEffect(() => {
    randomize();
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          onComplete(score);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => intervalRef.current && clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = () => {
    setScore((s) => s + 1);
    randomize();
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Focus Frenzy</Text>
      <Text style={styles.gameSubtitle}>Tap the target as many times as you can</Text>
      <Text style={styles.limitText}>Time: {timeLeft}s • Score: {score}</Text>
      <View style={styles.playfield}>
        <TouchableOpacity style={[styles.targetDot, { left: pos.x, top: pos.y }]} onPress={tap} activeOpacity={0.85}>
          <Text style={styles.targetDotText}>👆</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function WaveRiderGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [phase, setPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [cycle, setCycle] = useState(0);
  const [score, setScore] = useState(0);
  const timerRef = useRef<any>(null);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    timerRef.current = setInterval(() => {
      setPhase((p) => (p === 'inhale' ? 'exhale' : 'inhale'));
      setCycle((c) => {
        const next = c + 0.5;
        if (next >= 5) {
          clearInterval(timerRef.current);
          onComplete(score);
        }
        return next;
      });
    }, 2000);
    return () => timerRef.current && clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = () => {
    setScore((s) => s + 1);
  };

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] });

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Wave Rider</Text>
      <Text style={styles.gameSubtitle}>Breathe with the wave. Tap “Sync” each phase.</Text>
      <Text style={styles.limitText}>Cycles: {Math.floor(cycle)}/5 • Score: {score}</Text>
      <View style={styles.waveBox}>
        <Animated.View style={[styles.waveCircle, { transform: [{ scale }] }]}>
          <Text style={styles.waveEmoji}>🌊</Text>
        </Animated.View>
        <Text style={styles.breathingPhase}>{phase === 'inhale' ? 'Inhale' : 'Exhale'}</Text>
        <TouchableOpacity style={[styles.gameButton, { backgroundColor: '#3b82f6' }]} onPress={sync}>
          <Text style={styles.gameButtonText}>Sync</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ComingSoonGame({
  game,
  remainingPlays,
  onBack,
  onComplete,
}: {
  game: GameDef;
  remainingPlays: number;
  onBack: () => void;
  onComplete: () => void;
}) {
  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <View style={[styles.comingSoonCard, { borderColor: game.color }]}>
        <Text style={styles.comingSoonEmoji}>{game.emoji}</Text>
        <Text style={styles.gameTitle}>{game.name}</Text>
        <Text style={styles.gameSubtitle}>{game.description}</Text>
        <Text style={styles.limitText}>
          This game is in the backlog to port next (from the old repo).
        </Text>
        <Text style={[styles.limitText, { marginTop: 8 }]}>
          {remainingPlays === Infinity ? 'Premium: unlimited plays' : `Free plays remaining today: ${remainingPlays}`}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onComplete}
        style={[styles.gameButton, { backgroundColor: game.color }]}
        activeOpacity={0.9}
      >
        <Text style={styles.gameButtonText}>Mark as Played</Text>
      </TouchableOpacity>
    </View>
  );
}

function VisualFilterGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const emojis = ['🔺', '🔷', '🟡', '🟣', '🟢', '🟠'];
  const [round, setRound] = useState(1);
  const [target, setTarget] = useState('🔷');
  const [grid, setGrid] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('Find the target');

  const setup = () => {
    const t = emojis[Math.floor(Math.random() * emojis.length)];
    const distractors = emojis.filter((e) => e !== t);
    const g = Array.from({ length: 20 }, () => distractors[Math.floor(Math.random() * distractors.length)]);
    const idx = Math.floor(Math.random() * g.length);
    g[idx] = t;
    setTarget(t);
    setGrid(g);
    setStatus(`Round ${round}/5: Tap ${t}`);
  };

  useEffect(() => {
    setup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const tap = (e: string) => {
    if (e === target) {
      const nextScore = score + 1;
      setScore(nextScore);
      if (round >= 5) onComplete(nextScore);
      else setRound((r) => r + 1);
    } else {
      setStatus('Not that one—try again!');
    }
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Visual Filter</Text>
      <Text style={styles.gameSubtitle}>{status}</Text>
      <Text style={styles.limitText}>Score: {score}</Text>
      <View style={styles.grid20}>
        {grid.map((e, i) => (
          <TouchableOpacity key={i} style={styles.gridCell20} onPress={() => tap(e)} activeOpacity={0.85}>
            <Text style={{ fontSize: 22 }}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function TaskSwitcherGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [timeLeft, setTimeLeft] = useState(15);
  const [score, setScore] = useState(0);
  const [rule, setRule] = useState<'parity' | 'threshold'>('parity');
  const [n, setN] = useState(0);
  const intervalRef = useRef<any>(null);

  const next = () => {
    setRule((r) => (r === 'parity' ? 'threshold' : 'parity'));
    setN(1 + Math.floor(Math.random() * 9));
  };

  useEffect(() => {
    next();
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          onComplete(score);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => intervalRef.current && clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answer = (choice: 'left' | 'right') => {
    const correct =
      rule === 'parity' ? (choice === 'left' ? n % 2 === 1 : n % 2 === 0) : choice === 'left' ? n < 5 : n >= 5;
    if (correct) setScore((s) => s + 1);
    next();
  };

  const ruleText = rule === 'parity' ? 'LEFT=Odd • RIGHT=Even' : 'LEFT=<5 • RIGHT≥5';

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Task Switcher</Text>
      <Text style={styles.gameSubtitle}>Rules switch every turn</Text>
      <Text style={styles.limitText}>Time: {timeLeft}s • Score: {score}</Text>
      <View style={styles.bigCard}>
        <Text style={styles.bigCardTitle}>{ruleText}</Text>
        <Text style={styles.bigCardValue}>{n}</Text>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.gameButton, { backgroundColor: '#6366f1', flex: 1 }]} onPress={() => answer('left')}>
          <Text style={styles.gameButtonText}>LEFT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.gameButton, { backgroundColor: '#6366f1', flex: 1 }]} onPress={() => answer('right')}>
          <Text style={styles.gameButtonText}>RIGHT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AttentionTrainerGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [trial, setTrial] = useState(0);
  const [score, setScore] = useState(0);
  const [shown, setShown] = useState<'target' | 'distractor'>('distractor');
  const [locked, setLocked] = useState(false);
  const timerRef = useRef<any>(null);

  const next = () => {
    const isTarget = Math.random() < 0.35;
    setShown(isTarget ? 'target' : 'distractor');
    setLocked(false);
  };

  useEffect(() => {
    next();
    timerRef.current = setInterval(() => {
      setTrial((t) => {
        const nt = t + 1;
        if (nt >= 15) {
          clearInterval(timerRef.current);
          onComplete(score);
        } else {
          next();
        }
        return nt;
      });
    }, 900);
    return () => timerRef.current && clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = () => {
    if (locked) return;
    setLocked(true);
    if (shown === 'target') setScore((s) => s + 1);
    else setScore((s) => Math.max(0, s - 1));
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Attention Trainer</Text>
      <Text style={styles.gameSubtitle}>Tap only when the target appears</Text>
      <Text style={styles.limitText}>Trial: {Math.min(trial + 1, 15)}/15 • Score: {score}</Text>
      <TouchableOpacity onPress={tap} activeOpacity={0.9} style={[styles.reactionBox, { backgroundColor: shown === 'target' ? '#fce7f3' : '#f3f4f6' }]}>
        <Text style={styles.reactionMessage}>{shown === 'target' ? 'TAP!' : 'Do NOT tap'}</Text>
        <Text style={{ fontSize: 44, marginTop: 8 }}>{shown === 'target' ? '👆' : '✋'}</Text>
      </TouchableOpacity>
      <Text style={styles.limitText}>+1 for correct tap • -1 for false tap</Text>
    </View>
  );
}

function ConcentrationChallengeGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [holding, setHolding] = useState(false);
  const [best, setBest] = useState(0);
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (holding) {
      intervalRef.current = setInterval(() => {
        setCurrent((c) => c + 1);
      }, 1000);
    } else {
      intervalRef.current && clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, [holding]);

  useEffect(() => {
    setBest((b) => Math.max(b, current));
  }, [current]);

  const finish = () => {
    setHolding(false);
    onComplete(best);
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Concentration</Text>
      <Text style={styles.gameSubtitle}>Press & hold to stay focused</Text>
      <Text style={styles.limitText}>Current: {current}s • Best: {best}s</Text>
      <TouchableOpacity
        onPressIn={() => setHolding(true)}
        onPressOut={() => {
          setHolding(false);
          setCurrent(0);
        }}
        activeOpacity={0.9}
        style={[styles.comingSoonCard, { borderColor: '#f59e0b', backgroundColor: holding ? '#fef3c7' : '#fff' }]}
      >
        <Text style={styles.gameTitle}>{holding ? 'Hold…' : 'Hold to Focus'}</Text>
        <Text style={styles.gameSubtitle}>Don’t release!</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={finish} style={[styles.gameButton, { backgroundColor: '#f59e0b' }]}>
        <Text style={styles.gameButtonText}>Finish</Text>
      </TouchableOpacity>
    </View>
  );
}

function BreatheMountainGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [cycle, setCycle] = useState(0);
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [running, setRunning] = useState(false);
  const timerRef = useRef<any>(null);
  const anim = useRef(new Animated.Value(0)).current;

  const start = () => {
    setCycle(0);
    setPhase('inhale');
    setRunning(true);
  };

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      setPhase((p) => (p === 'inhale' ? 'hold' : p === 'hold' ? 'exhale' : 'inhale'));
      setCycle((c) => {
        const next = phase === 'exhale' ? c + 1 : c;
        if (next >= 5) {
          setRunning(false);
          onComplete(5);
        }
        return next;
      });
    };
    timerRef.current = setInterval(tick, 2000);
    return () => timerRef.current && clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase]);

  useEffect(() => {
    if (!running) return;
    Animated.timing(anim, { toValue: phase === 'inhale' ? 1 : 0, duration: 1800, useNativeDriver: true }).start();
  }, [phase, running, anim]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] });
  const phaseText = phase === 'inhale' ? 'Inhale' : phase === 'hold' ? 'Hold' : 'Exhale';

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Breathe Mountain</Text>
      <Text style={styles.gameSubtitle}>5 calm breathing cycles</Text>
      <Text style={styles.limitText}>Cycle: {cycle}/5</Text>
      <View style={styles.waveBox}>
        <Animated.View style={[styles.waveCircle, { transform: [{ scale }], backgroundColor: '#dcfce7' }]}>
          <Text style={styles.waveEmoji}>⛰️</Text>
        </Animated.View>
        <Text style={styles.breathingPhase}>{running ? phaseText : 'Ready'}</Text>
        {!running ? (
          <TouchableOpacity style={[styles.gameButton, { backgroundColor: '#10b981' }]} onPress={start}>
            <Text style={styles.gameButtonText}>Start</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.gameButton, { backgroundColor: '#9ca3af' }]} onPress={() => { setRunning(false); onComplete(cycle); }}>
            <Text style={styles.gameButtonText}>Stop</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  headerSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: 20 },
  limitRow: { marginBottom: 10 },
  limitText: { color: '#64748b', fontWeight: '600' },
  gamesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gameCard: { width: (width - 60) / 2, padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center' },
  gameEmoji: { fontSize: 32, marginBottom: 8 },
  gameName: { fontSize: 14, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  gameDescription: { fontSize: 11, color: '#ffffff', opacity: 0.9, textAlign: 'center' },

  // Game screens
  gameContainer: { paddingVertical: 8 },
  backButton: { marginBottom: 12 },
  backButtonText: { fontSize: 16, color: '#6366f1', fontWeight: '700' },
  gameTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  gameSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 12 },
  gameButton: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', marginVertical: 8 },
  gameButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  warningText: { color: '#ef4444', fontWeight: '700', textAlign: 'center', marginTop: 12 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 12 },

  reactionBox: { padding: 28, borderRadius: 16, alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  reactionMessage: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 6, textAlign: 'center' },
  reactionTime: { fontSize: 14, color: '#64748b' },

  breathingContainer: { alignItems: 'center', marginVertical: 18 },
  breathingCircle: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' },
  breathingPhase: { marginTop: 12, fontSize: 18, fontWeight: '800', color: '#1e293b' },

  memoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 10 },
  memoryColor: { width: 110, height: 110, borderRadius: 14, margin: 8 },
  memoryColorActive: { transform: [{ scale: 1.08 }], borderWidth: 3, borderColor: '#fff' },
  memoryColorDisabled: { opacity: 0.6 },

  balanceBar: { height: 16, backgroundColor: '#e5e7eb', borderRadius: 8, marginVertical: 18, position: 'relative' },
  balanceBall: { width: 20, height: 20, borderRadius: 10, position: 'absolute', top: -2, backgroundColor: '#10b981', transform: [{ translateX: -10 }] },

  soonPill: { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  soonPillText: { color: '#fff', fontWeight: '800', fontSize: 10 },
  comingSoonCard: { borderWidth: 2, borderRadius: 16, padding: 16, alignItems: 'center', backgroundColor: '#fff' },
  comingSoonEmoji: { fontSize: 44, marginBottom: 8 },

  grid16: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, justifyContent: 'center' },
  gridCell: { width: (width - 80) / 4, height: (width - 80) / 4, borderRadius: 14, backgroundColor: '#fff', margin: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  gridEmoji: { fontSize: 28 },
  grid20: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, justifyContent: 'center' },
  gridCell20: { width: (width - 80) / 5, height: (width - 80) / 5, borderRadius: 12, backgroundColor: '#fff', margin: 5, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  bigCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  bigCardTitle: { fontSize: 14, fontWeight: '800', color: '#64748b' },
  bigCardValue: { fontSize: 32, fontWeight: '900', color: '#1e293b', marginTop: 8, letterSpacing: 2, textAlign: 'center' },
  inputBox: { marginTop: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 18 },
  playfield: { height: 360, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginTop: 12 },
  targetDot: { position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: '#ec4899', alignItems: 'center', justifyContent: 'center' },
  targetDotText: { fontSize: 28 },
  waveBox: { marginTop: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  waveCircle: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  waveEmoji: { fontSize: 56 },
});
