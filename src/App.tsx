/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useRef, useState, useCallback } from 'react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'idle' | 'running' | 'gameOver'>('idle');
  const [score, setScore] = useState(0);
  const [theme, setTheme] = useState<'day' | 'night' | 'desert'>('day');

  const themes = {
    day: { bg: '#f7f7f7', fg: '#1a1a1a', obs: '#1a1a1a' },
    night: { bg: '#1a1a1a', fg: '#f7f7f7', obs: '#ffcc00' },
    desert: { bg: '#f4d03f', fg: '#5d4037', obs: '#b58900' }
  };
  const currentTheme = themes[theme];
  const gameLoopRef = useRef<number>();
  
  // Game refs for mutable values to avoid re-renders
  const dinoRef = useRef({ y: 150, vy: 0, ground: 150 });
  const runningnessRef = useRef(0); // 0 = idle, 1 = running
  type ObstacleType = 'fox' | 'rabbit' | 'bird' | 'eagle' | 'deer';
  const obstaclesRef = useRef<{x: number; type: ObstacleType}[]>([]);
  const frameCountRef = useRef(0);

  const resetGame = useCallback(() => {
    dinoRef.current = { y: 150, vy: 0, ground: 150 };
    obstaclesRef.current = [];
    setScore(0);
    frameCountRef.current = 0;
    setGameState('running');
  }, []);

  const jump = useCallback(() => {
    if (dinoRef.current.y === dinoRef.current.ground) {
      dinoRef.current.vy = -12;
    }
  }, []);

  const getObstacleType = (score: number): ObstacleType => {
      if (score < 5) return 'rabbit';
      if (score < 10) return Math.random() > 0.5 ? 'rabbit' : 'fox';
      if (score < 15) return Math.random() > 0.4 ? 'rabbit' : (Math.random() > 0.5 ? 'fox' : 'bird');
      if (score < 20) return Math.random() > 0.5 ? 'eagle' : 'fox';
      return Math.random() > 0.7 ? 'deer' : (Math.random() > 0.4 ? 'eagle' : 'bird');
  };

  const drawObstacle = (ctx: CanvasRenderingContext2D, x: number, type: ObstacleType, color: string) => {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;
      
      if (type === 'rabbit') {
         ctx.beginPath();
         // Ears
         ctx.moveTo(x + 5, 140); ctx.lineTo(x + 5, 120);
         ctx.moveTo(x + 15, 140); ctx.lineTo(x + 15, 120);
         // Head/Body
         ctx.arc(x + 10, 150, 10, 0, Math.PI * 2);
         ctx.stroke();
         ctx.fill();
      } else if (type === 'bird') {
         ctx.beginPath();
         // Flying bird shape
         ctx.moveTo(x, 100);
         ctx.quadraticCurveTo(x + 15, 80, x + 30, 100);
         ctx.quadraticCurveTo(x + 15, 90, x, 100);
         ctx.stroke();
         ctx.fill();
      } else if (type === 'eagle') {
         ctx.beginPath();
         // Flying eagle shape
         ctx.moveTo(x, 100);
         ctx.lineTo(x + 15, 80);
         ctx.lineTo(x + 30, 100);
         ctx.lineTo(x + 15, 95);
         ctx.closePath();
         ctx.stroke();
         ctx.fill();
      } else if (type === 'deer') {
         ctx.beginPath();
         // Body
         ctx.moveTo(x, 150); ctx.lineTo(x + 30, 150);
         // Antlers
         ctx.moveTo(x + 5, 150); ctx.lineTo(x + 5, 120);
         ctx.moveTo(x + 8, 150); ctx.lineTo(x + 8, 125);
         // Head
         ctx.arc(x + 5, 145, 8, 0, Math.PI * 2);
         ctx.stroke();
         ctx.fill();
      } else { // fox
         ctx.beginPath();
         // Body
         ctx.moveTo(x, 150); ctx.lineTo(x + 30, 150);
         // Tail
         ctx.moveTo(x + 30, 150); ctx.lineTo(x + 40, 130);
         // Head
         ctx.arc(x + 5, 145, 8, 0, Math.PI * 2);
         ctx.stroke();
         ctx.fill();
      }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (gameState === 'idle' || gameState === 'gameOver') resetGame();
        else jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, resetGame, jump]);

  // ... existing code ...
  const drawStickMan = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, runningness: number, frame: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const bob = runningness * Math.sin(frame * 0.4) * 4;
    const breathing = (1 - runningness) * Math.sin(frame * 0.1) * 2;
    const sway = (1 - runningness) * Math.sin(frame * 0.05) * 1;
    const baseY = y + bob + breathing;
    const baseX = x + sway;

    // Head
    ctx.beginPath();
    ctx.arc(baseX, baseY - 40, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Body
    ctx.beginPath();
    ctx.moveTo(baseX, baseY - 30);
    ctx.lineTo(baseX, baseY - 10);
    ctx.stroke();

    // Running pose arm/leg parameters
    const armOffset = Math.sin(frame * 0.2) * 15;
    const legOffset = Math.sin(frame * 0.2) * 20;

    // Drawing arms/legs based on runningness
    const drawLimb = (direction: 'arm' | 'leg', poseAlpha: number) => {
      const isArm = direction === 'arm';
      const startY = baseY - (isArm ? 30 : 10);
      const endX = baseX + (isArm ? armOffset : legOffset) * (poseAlpha > 0.5 ? 1 : -1);
      const endY = baseY - (isArm ? 15 : -10);
      
      // Interpolate between idle (close to body) and running (wide)
      const idleX = baseX + (isArm ? 10 : 5) * (poseAlpha > 0.5 ? 1 : -1);
      const idleY = baseY - (isArm ? 20 : 0);
      
      const targetX = idleX + (endX - idleX) * runningness;
      const targetY = idleY + (endY - idleY) * runningness;

      ctx.beginPath();
      ctx.moveTo(baseX, startY);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
    };

    // Draw 2 arms and 2 legs
    drawLimb('arm', 0);
    drawLimb('arm', 1);
    drawLimb('leg', 0);
    drawLimb('leg', 1);

    // Cigarette/Smoke only when runningness is low
    if (runningness < 0.5) {
      const opacity = 1 - runningness * 2;
      ctx.fillStyle = `rgba(255, 204, 0, ${opacity})`;
      ctx.fillRect(baseX + 10, baseY - 22, 10, 2); // Cigarette
      
      const smokeFrame = frame % 40;
      const smokeOpacity = (1 - smokeFrame / 40) * opacity;
      ctx.fillStyle = `rgba(180, 180, 180, ${0.5 * smokeOpacity})`;
      ctx.beginPath();
      ctx.arc(baseX + 20 + smokeFrame * 0.5, baseY - 25 - smokeFrame * 0.5, 2 + smokeFrame * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      // Clear
      ctx.fillStyle = currentTheme.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update runningness for smooth transition
      const targetRunningness = gameState === 'running' ? 1 : 0;
      runningnessRef.current += (targetRunningness - runningnessRef.current) * 0.1;

      if (gameState === 'running') {
        // Physics
        dinoRef.current.vy += 0.6; // Gravity
        dinoRef.current.y += dinoRef.current.vy;
        if (dinoRef.current.y > dinoRef.current.ground) {
          dinoRef.current.y = dinoRef.current.ground;
          dinoRef.current.vy = 0;
        }

        // Obstacles
        frameCountRef.current++;
        if (frameCountRef.current % 100 === 0) {
          const type = getObstacleType(score);
          console.log('Spawning obstacle:', type);
          obstaclesRef.current.push({ x: canvas.width, type });
        }

        for (let i = 0; i < obstaclesRef.current.length; i++) {
          obstaclesRef.current[i].x -= 5;
          
          // Draw Obstacle
          drawObstacle(ctx, obstaclesRef.current[i].x, obstaclesRef.current[i].type, currentTheme.obs);

          // Collision
          const isColliding = 
            ((obstaclesRef.current[i].type === 'fox' || obstaclesRef.current[i].type === 'deer' || obstaclesRef.current[i].type === 'rabbit') && 
             obstaclesRef.current[i].x < 70 && obstaclesRef.current[i].x > 10 && dinoRef.current.y > 100) ||
            ((obstaclesRef.current[i].type === 'bird' || obstaclesRef.current[i].type === 'eagle') && 
             obstaclesRef.current[i].x < 70 && obstaclesRef.current[i].x > 10 && dinoRef.current.y < 120);

          if (isColliding) {
            setGameState('gameOver');
          }

          // Remove off-screen
          if (obstaclesRef.current[i].x < -30) {
            obstaclesRef.current.splice(i, 1);
            setScore(s => s + 1);
          }
        }
      }
      
      const charX = gameState === 'running' ? 50 : 300;
      const charY = (gameState === 'running' ? dinoRef.current.y : 150) + 40;
      drawStickMan(ctx, charX, charY, runningnessRef.current, frameCountRef.current, currentTheme.fg);
      
      gameLoopRef.current = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(gameLoopRef.current!);
  }, [gameState, drawStickMan, score, currentTheme]);
  // ... existing code ...

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fbfbfb] text-[#1a1a1a] font-sans p-4">
      <h1 className="text-3xl font-bold mb-8 tracking-tighter uppercase">Pixel Dino Dash</h1>
      <p className="mb-8 font-mono tracking-widest text-[#1a1a1a]/60">Score: {score}</p>

      <div className="flex gap-4 mb-4">
        {(Object.keys(themes) as Array<keyof typeof themes>).map(t => (
          <button key={t} onClick={() => setTheme(t)} className="px-4 py-2 bg-gray-200 rounded capitalize">{t}</button>
        ))}
      </div>

      <canvas 
        ref={canvasRef} 
        width={600} 
        height={200} 
        className="border border-[#eeeeee] bg-white rounded-lg shadow-sm"
      />
      <div className="mt-8 text-[11px] font-bold uppercase tracking-[0.3em] text-[#1a1a1a]/40">
        {gameState === 'idle' && <p>Press Space to Start</p>}
        {gameState === 'gameOver' && <p className="text-[#1a1a1a] font-bold">Game Over! Press Space to Restart</p>}
        {gameState === 'running' && <p>Use Space to Jump</p>}
      </div>
    </div>
  );

}

