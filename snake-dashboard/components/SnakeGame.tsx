"use client";

import { useEffect, useState, useCallback, useRef } from "react";

const GRID_SIZE = 20;
const TICK_RATE = 150;

type Point = { x: number; y: number };

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
  isStatic = false
}: { 
  onGameStart?: () => void;
  onGameOver?: () => void;
  onExit?: () => void;
  forcedPlaying?: boolean;
  isStatic?: boolean;
}) {
  const [snake, setSnake] = useState<Point[]>([]);
  const [direction, setDirection] = useState<Point>({ x: 0, y: -1 });
  const [food, setFood] = useState<Point>({ x: -1, y: -1 });
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [isMounted, setIsMounted] = useState(false);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setSnake(getRandomSnake());
    setFood(getRandomPoint());
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
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const key = e.key.toLowerCase();
      setPressedKeys((prev) => new Set(prev).add(key));
      
      if (e.key === "Escape") {
        setIsPlaying(false);
        onExit?.();
        return;
      }

      if (key === "p" && !isPlaying && !isStatic) {
        setIsPlaying(true);
        setHasStarted(true);
        onGameStart?.();
        return;
      }
      
      if (!isPlaying) return;
      if (key === "w" && direction.y !== 1) setDirection({ x: 0, y: -1 });
      if (key === "s" && direction.y !== -1) setDirection({ x: 0, y: 1 });
      if (key === "a" && direction.x !== 1) setDirection({ x: -1, y: 0 });
      if (key === "d" && direction.x !== -1) setDirection({ x: 1, y: 0 });
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

  const generateFood = useCallback(() => {
    let newFood: Point;
    while (true) {
      newFood = getRandomPoint();
      if (!snake.some((segment) => segment.x === newFood.x && segment.y === newFood.y)) {
        break;
      }
    }
    setFood(newFood);
  }, [snake]);

  const resetGame = () => {
    setSnake(getRandomSnake());
    setDirection({ x: 0, y: -1 });
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);
    onGameStart?.();
    generateFood();
  };

  const moveSnake = useCallback(() => {
    setSnake((prevSnake) => {
      if (prevSnake.length === 0) return prevSnake;
      const head = prevSnake[0];
      const newHead = {
        x: (head.x + direction.x + GRID_SIZE) % GRID_SIZE,
        y: (head.y + direction.y + GRID_SIZE) % GRID_SIZE,
      };

      if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        setIsGameOver(true);
        setIsPlaying(false);
        onGameOver?.();
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore((s) => s + 10);
        generateFood();
      } else {
        newSnake.pop();
      }
      return newSnake;
    });
  }, [direction, food, generateFood, onGameOver]);

  useEffect(() => {
    if (isPlaying && !isGameOver) {
      gameLoopRef.current = setInterval(moveSnake, TICK_RATE);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [isPlaying, isGameOver, moveSnake]);

  if (!isMounted) return null;

  const gameContent = (
    <div 
      className={`relative bg-stone-200 p-2 overflow-hidden transition-all duration-500 ${
        isPlaying ? "w-full h-full" : "w-[100px] h-[100px] rounded-lg shadow-inner"
      }`}
    >
      <div 
        className="grid gap-px h-full w-full"
        style={{ 
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)` 
        }}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
          const x = i % GRID_SIZE;
          const y = Math.floor(i / GRID_SIZE);
          
          let isActive = false;
          if (isStatic || !isPlaying) {
            isActive = SNAKES_PATTERN.some(p => p.x === x && p.y === y);
          } else {
            isActive = snake.some((s) => s.x === x && s.y === y);
          }
          
          const isFood = (isStatic || !isPlaying) ? false : (food.x === x && food.y === y);

          return (
            <div
              key={i}
              className={`rounded-sm transition-colors duration-75 ${
                isActive ? "bg-stone-800" : isFood ? "bg-stone-500 animate-pulse" : "bg-stone-300/50"
              }`}
            />
          );
        })}
      </div>

      {isGameOver && (
        <div className="absolute inset-0 bg-stone-200/90 flex flex-col items-center justify-center z-[60]">
          <h2 className="text-4xl font-black text-stone-800 mb-2">GAME OVER</h2>
          <p className="text-stone-600 mb-6 font-bold text-xl">SCORE: {score}</p>
          <button 
            onClick={resetGame}
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
    <div className={`flex items-center justify-center transition-all duration-500 ${isPlaying ? "fixed inset-0 z-50 bg-stone-200" : "relative h-[155px]"}`}>
      {!isPlaying ? (
        <div className="relative flex flex-col items-center gap-4">
          {/* Score on the left - top aligned and color-matched */}
          {hasStarted && (
            <div className="absolute right-full mr-6 top-0 text-stone-800 font-mono flex flex-col items-center animate-in fade-in slide-in-from-right-4 duration-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              <span className="text-[9px] uppercase tracking-[0.2em] mb-1 opacity-60">Score</span>
              <span className="text-sm font-bold leading-none">{score}</span>
            </div>
          )}
          
          {gameContent}
          <button 
            onClick={() => {
              setIsPlaying(true);
              setHasStarted(true);
              onGameStart?.();
            }}
            className="px-8 py-1.5 bg-white border-[3px] border-stone-800 text-stone-800 font-black uppercase tracking-tight text-sm shadow-[3px_3px_0px_0px_rgba(44,44,44,1)] hover:shadow-none hover:translate-x-[1.5px] hover:translate-y-[1.5px] transition-all flex items-center gap-2"
          >
            <span className="px-1.5 py-0.5 rounded bg-stone-800 text-white font-mono shadow-sm text-[10px] min-w-0 h-5 flex items-center justify-center">P</span>
            PLAY
          </button>
        </div>
      ) : (
        <>
          {gameContent}
          
          {/* In-Game UI Overlay */}
          <div className="fixed top-8 left-8 text-stone-800 font-mono text-4xl font-bold z-[60]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {score}
          </div>

          <div className="fixed bottom-8 left-8 flex flex-col gap-4 z-[60]">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Controls</span>
              <div className="grid grid-cols-3 gap-1 w-fit">
                <div />
                <ControlKbd triggerKey="W" isPressed={pressedKeys.has("w")} dark />
                <div />
                <ControlKbd triggerKey="A" isPressed={pressedKeys.has("a")} dark />
                <ControlKbd triggerKey="S" isPressed={pressedKeys.has("s")} dark />
                <ControlKbd triggerKey="D" isPressed={pressedKeys.has("d")} dark />
              </div>
            </div>
            <div className="flex items-center gap-2">
               <ControlKbd triggerKey="Esc" isPressed={pressedKeys.has("escape")} dark />
               <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">to exit</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
