"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Kbd } from "./ui/kbd";
import { TurtleIcon } from "./icons/TurtleIcon";

const GRID_SIZE = 20;
const INITIAL_TICK_RATE = 150;
const MIN_SNAKE_LENGTH = 3;

type Point = { x: number; y: number };
type DangerBlock = Point & { penalty: 10 | 25; lengthPenalty: 2 | 4 };
type WallType = "lethal" | "penalty";
type WallSegment = Point & { type: WallType };
type FloatingScore = { id: number; val: number; x: number; y: number };

// Centered "SNAKES" pattern for a 20x20 grid
const SNAKES_PATTERN: Point[] = [
  // S (Row 1)
  {x: 4, y: 5}, {x: 5, y: 5}, {x: 6, y: 5},
  {x: 4, y: 6},
  {x: 4, y: 7}, {x: 5, y: 7}, {x: 6, y: 7},
  {x: 6, y: 8},
  {x: 4, y: 9}, {x: 5, y: 9}, {x: 6, y: 9},
  
  // N (Row 1)
  {x: 8, y: 5}, {x: 8, y: 6}, {x: 8, y: 7}, {x: 8, y: 8}, {x: 8, y: 9},
  {x: 9, y: 6}, {x: 10, y: 7},
  {x: 11, y: 5}, {x: 11, y: 6}, {x: 11, y: 7}, {x: 11, y: 8}, {x: 11, y: 9},

  // A (Row 1)
  {x: 14, y: 5},
  {x: 13, y: 6}, {x: 15, y: 6},
  {x: 13, y: 7}, {x: 14, y: 7}, {x: 15, y: 7},
  {x: 13, y: 8}, {x: 15, y: 8},
  {x: 13, y: 9}, {x: 15, y: 9},

  // K (Row 2)
  {x: 4, y: 11}, {x: 4, y: 12}, {x: 4, y: 13}, {x: 4, y: 14}, {x: 4, y: 15},
  {x: 7, y: 11}, {x: 6, y: 12}, {x: 5, y: 13}, {x: 6, y: 14}, {x: 7, y: 15},

  // E (Row 2)
  {x: 9, y: 11}, {x: 10, y: 11}, {x: 11, y: 11},
  {x: 9, y: 12},
  {x: 9, y: 13}, {x: 10, y: 13}, {x: 11, y: 13},
  {x: 9, y: 14},
  {x: 9, y: 15}, {x: 10, y: 15}, {x: 11, y: 15},

  // S (Row 2)
  {x: 13, y: 11}, {x: 14, y: 11}, {x: 15, y: 11},
  {x: 13, y: 12},
  {x: 13, y: 13}, {x: 14, y: 13}, {x: 15, y: 13},
  {x: 15, y: 14},
  {x: 13, y: 15}, {x: 14, y: 15}, {x: 15, y: 15},
];

const getRandomPoint = () => ({
  x: Math.floor(Math.random() * GRID_SIZE),
  y: Math.floor(Math.random() * GRID_SIZE),
});

const getRandomSnake = () => {
  const head = getRandomPoint();
  return [
    head,
    { x: head.x, y: (head.y + 1) % GRID_SIZE },
    { x: head.x, y: (head.y + 2) % GRID_SIZE },
  ];
};

function ControlKbd({ triggerKey, isPressed, dark = false }: { triggerKey: string; isPressed: boolean; dark?: boolean }) {
  return (
    <div 
      className={`inline-flex h-7 w-7 items-center justify-center rounded border-b-2 font-mono text-[10px] font-bold transition-all duration-75 ${
        isPressed 
          ? "border-stone-800 bg-stone-800 text-stone-100 translate-y-0.5" 
          : dark 
            ? "border-stone-400 bg-stone-300 text-stone-800"
            : "border-stone-300 bg-stone-100 text-stone-600"
      }`}
    >
      {triggerKey}
    </div>
  );
}

export function SnakeGame({ 
  onGameStart, 
  onGameOver,
  onExit,
  forcedPlaying = false,
  isStatic = false,
  className = ""
}: { 
  onGameStart?: () => void;
  onGameOver?: () => void;
  onExit?: () => void;
  forcedPlaying?: boolean;
  isStatic?: boolean;
  className?: string;
}) {
  const [snake, setSnake] = useState<Point[]>([]);
  const [direction, setDirection] = useState<Point>({ x: 0, y: -1 });
  const [food, setFood] = useState<Point>({ x: -1, y: -1 });
  const [dangerBlocks, setDangerBlocks] = useState<DangerBlock[]>([]);
  const [slowDownBlock, setSlowDownBlock] = useState<Point | null>(null);
  const [activeWall, setActiveWall] = useState<{ side: string; type: WallType } | null>(null);
  const [flashCoord, setFlashCoord] = useState<Point | null>(null);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [tickRate, setTickRate] = useState(INITIAL_TICK_RATE);
  const [isSlowed, setIsSlowed] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [isMounted, setIsMounted] = useState(false);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const slowDownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedDirectionRef = useRef<Point>({ x: 0, y: -1 });
  const inputQueueRef = useRef<Point[]>([]);

  useEffect(() => {
    setIsMounted(true);
    setSnake(getRandomSnake());
    setFood(getRandomPoint());
  }, []);

  useEffect(() => {
    return () => {
      if (slowDownTimeoutRef.current) clearTimeout(slowDownTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (forcedPlaying && !isPlaying) {
      setIsPlaying(true);
      setHasStarted(true);
    } else if (!forcedPlaying && isPlaying) {
      setIsPlaying(false);
    }
  }, [forcedPlaying, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      onGameStart?.();
    }
  }, [isPlaying, onGameStart]);

  useEffect(() => {
    if (isGameOver) {
      onGameOver?.();
    }
  }, [isGameOver, onGameOver]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const key = e.key.toLowerCase();
      setPressedKeys((prev) => new Set(prev).add(key));
      
      if (e.key === "Escape") {
        setIsPlaying(false);
        setIsGameOver(false);
        onExit?.();
        return;
      }

      if (key === "p" && !isPlaying && !isStatic && !isGameOver) {
        setIsPlaying(true);
        setHasStarted(true);
        return;
      }
      
      if (!isPlaying) return;

      const getLatestDirection = () => {
        if (inputQueueRef.current.length > 0) {
          return inputQueueRef.current[inputQueueRef.current.length - 1];
        }
        return lastProcessedDirectionRef.current;
      };

      const latestDir = getLatestDirection();

      if (key === "w" && latestDir.y !== 1 && latestDir.y !== -1) {
        inputQueueRef.current.push({ x: 0, y: -1 });
      } else if (key === "s" && latestDir.y !== -1 && latestDir.y !== 1) {
        inputQueueRef.current.push({ x: 0, y: 1 });
      } else if (key === "a" && latestDir.x !== 1 && latestDir.x !== -1) {
        inputQueueRef.current.push({ x: -1, y: 0 });
      } else if (key === "d" && latestDir.x !== -1 && latestDir.x !== 1) {
        inputQueueRef.current.push({ x: 1, y: 0 });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setPressedKeys((prev) => {
        const next = new Set(prev);
        next.delete(e.key.toLowerCase());
        return next;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isPlaying, direction, onExit, isStatic, onGameStart]);

  const triggerFlash = useCallback((p: Point) => {
    setFlashCoord(p);
    setTimeout(() => setFlashCoord(null), 300);
  }, []);

  const addFloatingScore = useCallback((val: number, x: number, y: number) => {
    const id = Date.now() + Math.random();
    setFloatingScores(prev => [...prev, { id, val, x, y }]);
    setTimeout(() => {
      setFloatingScores(prev => prev.filter(f => f.id !== id));
    }, 1000);
  }, []);

  const getWallSegments = useCallback((wall: { side: string; type: WallType } | null) => {
    if (!wall) return [];
    const segments: Point[] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      let x = 0, y = 0;
      if (wall.side === "top") { x = i; y = 0; }
      if (wall.side === "bottom") { x = i; y = GRID_SIZE - 1; }
      if (wall.side === "left") { x = 0; y = i; }
      if (wall.side === "right") { x = GRID_SIZE - 1; y = i; }
      segments.push({ x, y });
    }
    return segments;
  }, []);

  const spawnNewItems = useCallback((currentSnake: Point[], currentScore: number, shouldRotateWall: boolean) => {
    // Wall logic: rotate only on 50pt milestones after 100
    if (currentScore >= 100) {
      if (shouldRotateWall || !activeWall) {
        const sides = ["top", "bottom", "left", "right"];
        const validSides = sides.filter(side => {
          const segments = getWallSegments({ side, type: "lethal" });
          return !segments.some(seg => currentSnake.some(s => s.x === seg.x && s.y === seg.y));
        });
        
        if (validSides.length > 0) {
          const side = validSides[Math.floor(Math.random() * validSides.length)];
          const type = Math.random() > 0.5 ? "lethal" : "penalty";
          setActiveWall({ side, type });
        }
      }
    } else {
      setActiveWall(null);
    }

    const wallSegments = getWallSegments(activeWall);
    const isOccupied = (p: Point) => {
      return currentSnake.some(s => s.x === p.x && s.y === p.y) || 
             wallSegments.some(w => w.x === p.x && w.y === p.y);
    };

    // Generate Food
    let newFood: Point;
    while (true) {
      newFood = getRandomPoint();
      if (!isOccupied(newFood)) break;
    }
    setFood(newFood);

    // Danger blocks logic (60% chance - MORE COMMON)
    let newDanger: DangerBlock | null = null;
    if (Math.random() < 0.6) {
      let dp: Point;
      while (true) {
        dp = getRandomPoint();
        if (!isOccupied(dp) && (dp.x !== newFood.x || dp.y !== newFood.y)) break;
      }
      const penalty = Math.random() > 0.5 ? 25 : 10;
      const lengthPenalty = penalty === 25 ? 4 : 2;
      newDanger = { ...dp, penalty, lengthPenalty };
      setDangerBlocks([newDanger]);
    } else {
      setDangerBlocks([]);
    }

    // Slow down block logic (15% chance - RARE)
    if (Math.random() < 0.15) {
      let newSlow: Point;
      while (true) {
        newSlow = getRandomPoint();
        const occupiedByOthers = (newSlow.x === newFood.x && newSlow.y === newFood.y) || 
                                (newDanger && newSlow.x === newDanger.x && newSlow.y === newDanger.y);
        if (!isOccupied(newSlow) && !occupiedByOthers) break;
      }
      setSlowDownBlock(newSlow);
    } else {
      setSlowDownBlock(null);
    }
  }, [getWallSegments, activeWall]);

  const resetGame = () => {
    const initialSnake = getRandomSnake();
    if (slowDownTimeoutRef.current) clearTimeout(slowDownTimeoutRef.current);
    inputQueueRef.current = [];
    lastProcessedDirectionRef.current = { x: 0, y: -1 };
    setSnake(initialSnake);
    setDirection({ x: 0, y: -1 });
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);
    setIsSlowed(false);
    setTickRate(INITIAL_TICK_RATE);
    setDangerBlocks([]);
    setSlowDownBlock(null);
    setActiveWall(null);
    setFloatingScores([]);
    spawnNewItems(initialSnake, 0, true);
  };

  const moveSnake = useCallback(() => {
    const nextDir = inputQueueRef.current.length > 0 
      ? inputQueueRef.current.shift()! 
      : direction;
    
    if (nextDir !== direction) {
      setDirection(nextDir);
    }
    
    lastProcessedDirectionRef.current = nextDir;

    setSnake((prevSnake) => {
      if (prevSnake.length === 0) return prevSnake;
      const head = prevSnake[0];
      
      const nextX = head.x + nextDir.x;
      const nextY = head.y + nextDir.y;

      const wrappedX = (nextX + GRID_SIZE) % GRID_SIZE;
      const wrappedY = (nextY + GRID_SIZE) % GRID_SIZE;
      const newHead = { x: wrappedX, y: wrappedY };

      // EXPLICIT WALL COLLISION: Only hit if crossing the specific boundary from the inside
      let hitWall = false;
      if (activeWall) {
        if (activeWall.side === "top" && head.y === 0 && nextDir.y === -1) hitWall = true;
        if (activeWall.side === "bottom" && head.y === GRID_SIZE - 1 && nextDir.y === 1) hitWall = true;
        if (activeWall.side === "left" && head.x === 0 && nextDir.x === -1) hitWall = true;
        if (activeWall.side === "right" && head.x === GRID_SIZE - 1 && nextDir.x === 1) hitWall = true;
      }

      if (hitWall) {
        if (activeWall?.type === "lethal") {
          setIsGameOver(true);
          setIsPlaying(false);
          return prevSnake;
        } else {
          setScore(s => Math.max(0, s - 5));
          addFloatingScore(-5, newHead.x, newHead.y);
          triggerFlash(newHead);
          if (!isSlowed) setTickRate(prev => Math.min(prev + 5, 250));
        }
      }

      if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        setIsGameOver(true);
        setIsPlaying(false);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];
      
      if (newHead.x === food.x && newHead.y === food.y) {
        const newScore = score + 10;
        const oldMilestone = Math.floor(score / 50);
        const newMilestone = Math.floor(newScore / 50);
        setScore(newScore);
        // rotate hazards every food, rotate wall every 50 points after 100
        spawnNewItems(newSnake, newScore, newMilestone > oldMilestone);
      } else {
        const dangerIndex = dangerBlocks.findIndex(d => d.x === newHead.x && d.y === newHead.y);
        const hitSlow = slowDownBlock?.x === newHead.x && slowDownBlock?.y === newHead.y;

        if (dangerIndex !== -1) {
          const danger = dangerBlocks[dangerIndex];
          setScore(s => Math.max(0, s - danger.penalty));
          addFloatingScore(-danger.penalty, newHead.x, newHead.y);
          triggerFlash(newHead);
          setDangerBlocks(prev => prev.filter((_, i) => i !== dangerIndex));
          
          for (let i = 0; i < danger.lengthPenalty; i++) {
            if (newSnake.length > MIN_SNAKE_LENGTH) newSnake.pop();
          }
        } else if (hitSlow) {
          if (!isSlowed) {
            setIsSlowed(true);
            setTickRate(300); // 2x slower
            setSlowDownBlock(null);
            
            slowDownTimeoutRef.current = setTimeout(() => {
              setIsSlowed(false);
              setTickRate(INITIAL_TICK_RATE);
              slowDownTimeoutRef.current = null;
            }, 10000); // 10 seconds
          }
          newSnake.pop();
        } else {
          newSnake.pop();
        }
      }
      return newSnake;
    });
  }, [direction, food, dangerBlocks, slowDownBlock, score, activeWall, isSlowed, getWallSegments, spawnNewItems, addFloatingScore, triggerFlash]);

  const moveSnakeRef = useRef(moveSnake);
  useEffect(() => {
    moveSnakeRef.current = moveSnake;
  }, [moveSnake]);

  useEffect(() => {
    if (isPlaying && !isGameOver) {
      const id = setInterval(() => {
        moveSnakeRef.current();
      }, tickRate);
      gameLoopRef.current = id;
      return () => clearInterval(id);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }
  }, [isPlaying, isGameOver, tickRate]);

  if (!isMounted) return null;

  const wallSegments = getWallSegments(activeWall);

  const gameContent = (
    <div 
      className={`relative bg-stone-200 p-1 overflow-hidden transition-all duration-500 cursor-pointer ${
        isPlaying || isGameOver ? "!w-full !h-full p-2 cursor-default" : "w-10 h-10 lg:w-12 lg:h-12 rounded shadow-sm hover:shadow-md hover:bg-stone-300"
      } ${!isPlaying && !isGameOver ? className : ""}`}
      onClick={() => {
        if (!isPlaying && !isStatic) {
          if (isGameOver) {
            resetGame();
          } else {
            setIsPlaying(true);
            setHasStarted(true);
            resetGame();
          }
        }
      }}
    >
      <div 
        className="grid gap-[0.5px] h-full w-full relative"
        style={{ 
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)` 
        }}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
          const x = i % GRID_SIZE;
          const y = Math.floor(i / GRID_SIZE);
          
          let isActive = false;
          if (isStatic || (!isPlaying && !isGameOver)) {
            isActive = SNAKES_PATTERN.some(p => p.x === x && p.y === y);
          } else {
            isActive = snake.some((s) => s.x === x && s.y === y);
          }
          
          const isFood = (isStatic || (!isPlaying && !isGameOver)) ? false : (food.x === x && food.y === y);
          const isWall = (isStatic || (!isPlaying && !isGameOver)) ? false : wallSegments.some(w => w.x === x && w.y === y);
          const danger = (isStatic || (!isPlaying && !isGameOver)) ? null : dangerBlocks.find(d => d.x === x && d.y === y);
          const isSlow = (isStatic || (!isPlaying && !isGameOver)) ? false : (slowDownBlock?.x === x && slowDownBlock?.y === y);
          const isFlashing = flashCoord?.x === x && flashCoord?.y === y;

          return (
            <div
              key={i}
              className={`rounded-[0.5px] transition-all duration-75 flex items-center justify-center overflow-visible ${
                isFlashing ? "bg-red-500 z-10 scale-110" :
                isActive ? "bg-stone-800" : 
                isFood ? "bg-stone-500 animate-pulse" : 
                isWall && activeWall?.type === "lethal" ? "bg-red-950/80" :
                isWall && activeWall?.type === "penalty" ? "bg-stone-700/80" :
                "bg-stone-300/30"
              }`}
            >
              {danger && (
                <span className="text-5xl font-black text-red-800 leading-none tracking-tighter select-none" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  -{danger.penalty}
                </span>
              )}
              {isSlow && (
                <TurtleIcon className="w-12 h-12 text-emerald-700 opacity-80" />
              )}
              {isWall && (
                 <div className={`w-full h-full ${activeWall?.type === "lethal" ? "bg-red-950/20" : "bg-stone-700/20"}`} />
              )}
            </div>
          );
        })}
        
        {floatingScores.map(fs => (
          <div 
            key={fs.id}
            className="absolute pointer-events-none text-red-600 font-black text-sm animate-out fade-out slide-out-to-top-12 duration-1000 fill-mode-forwards"
            style={{ 
              left: `${(fs.x / GRID_SIZE) * 100}%`, 
              top: `${(fs.y / GRID_SIZE) * 100}%`,
              fontFamily: 'JetBrains Mono, monospace',
              zIndex: 100
            }}
          >
            {fs.val}
          </div>
        ))}
      </div>

      {isGameOver && (
        <div className="absolute inset-0 bg-stone-200/90 flex flex-col items-center justify-center z-[60]">
          <div className="fixed top-8 left-8 flex items-center gap-2 z-[60]">
             <Kbd triggerKey="Escape" className="font-bold">Esc</Kbd>
          </div>
          <h2 className="text-4xl font-black text-stone-800 mb-2">GAME OVER</h2>
          <p className="text-stone-600 mb-6 font-bold text-xl">SCORE: {score}</p>
          <button 
            onClick={(e) => { e.stopPropagation(); resetGame(); }}
            className="px-8 py-3 bg-white border-4 border-stone-800 text-stone-800 font-black uppercase tracking-tighter shadow-[4px_4px_0px_0px_rgba(44,44,44,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            TRY AGAIN
          </button>
        </div>
      )}
    </div>
  );

  if (isStatic) return gameContent;

  return (
    <>
      {isPlaying || isGameOver ? (
        <div className="fixed inset-0 z-50 bg-stone-200 flex items-center justify-center">
          {gameContent}
          
          {!isGameOver && (
            <>
              {/* In-Game UI Overlay */}
              <div className="fixed top-8 right-8 flex flex-col items-end gap-1 z-[60]">
                <div className="text-stone-800 font-mono text-4xl font-bold leading-none" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {score}
                </div>
                {isSlowed && (
                  <div className="flex items-center gap-1 text-emerald-700 font-bold text-xs uppercase tracking-widest animate-pulse">
                    <TurtleIcon className="w-4 h-4" />
                    Slowed
                  </div>
                )}
              </div>

              <div className="fixed top-8 left-8 flex items-center gap-2 z-[60]">
                 <Kbd triggerKey="Escape" className="font-bold">Esc</Kbd>
              </div>

              <div className="fixed bottom-8 left-8 flex flex-col gap-4 z-[60]">
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-1 w-fit">
                    <div />
                    <ControlKbd triggerKey="W" isPressed={pressedKeys.has("w")} dark />
                    <div />
                    <ControlKbd triggerKey="A" isPressed={pressedKeys.has("a")} dark />
                    <ControlKbd triggerKey="S" isPressed={pressedKeys.has("s")} dark />
                    <ControlKbd triggerKey="D" isPressed={pressedKeys.has("d")} dark />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {gameContent}
          {hasStarted && (
            <div className="text-stone-400 font-mono text-xl font-bold flex flex-col items-start animate-in fade-in slide-in-from-left-2 duration-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              <span className="text-[8px] uppercase tracking-[0.2em] opacity-60">Score</span>
              {score}
            </div>
          )}
        </div>
      )}
    </>
  );
}
