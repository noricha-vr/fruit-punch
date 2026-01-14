
import React, { useState, useEffect, useCallback } from 'react';
import { GameState } from './types';
import PoseGame from './components/PoseGame';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    timeLeft: 60,
    status: 'idle',
  });
  const [highScore, setHighScore] = useState(0);
  const [commentary, setCommentary] = useState<string>("カメラを許可してゲームを始めよう！");

  const startGame = () => {
    setGameState({ score: 0, timeLeft: 60, status: 'playing' });
  };

  const goHome = () => {
    setGameState({ score: 0, timeLeft: 60, status: 'idle' });
  };

  const endGame = useCallback(async (finalScore: number) => {
    setGameState(prev => ({ ...prev, status: 'gameover' }));
    if (finalScore > highScore) setHighScore(finalScore);

    // Get AI commentary
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `ユーザーがゲーム「フルーツ・クラッパー」を終了しました。スコアは${finalScore}点でした。最高スコアは${highScore}点です。短く、励ましや面白い一言を日本語で言ってください。`
      });
      setCommentary(response.text || "ナイスチャレンジ！");
    } catch (error) {
      console.error("AI Error:", error);
      setCommentary("ゲーム終了！次はもっと狙っていこう！");
    }
  }, [highScore]);

  useEffect(() => {
    let timer: number;
    if (gameState.status === 'playing' && gameState.timeLeft > 0) {
      timer = window.setInterval(() => {
        setGameState(prev => {
          if (prev.timeLeft <= 1) {
            clearInterval(timer);
            endGame(prev.score);
            return { ...prev, timeLeft: 0 };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState.status, gameState.timeLeft, endGame]);

  const updateScore = (points: number) => {
    setGameState(prev => ({ ...prev, score: prev.score + points }));
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans">
      {/* HUD - Always visible on top during gameplay */}
      {gameState.status === 'playing' && (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-50 pointer-events-none">
          <div className="bg-black/40 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl transition-all duration-300">
            <p className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-black mb-1">Score</p>
            <p className="text-4xl font-black text-white tabular-nums drop-shadow-md">{gameState.score}</p>
          </div>
          
          <div className="bg-black/40 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center transition-all duration-300">
            <p className="text-[10px] uppercase tracking-[0.2em] text-orange-400 font-black mb-1">Time</p>
            <p className={`text-4xl font-black tabular-nums drop-shadow-md ${gameState.timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {gameState.timeLeft}s
            </p>
          </div>

          <div className="bg-black/40 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl text-right transition-all duration-300">
            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-black mb-1">Best</p>
            <p className="text-4xl font-black text-white tabular-nums drop-shadow-md">{highScore}</p>
          </div>
        </div>
      )}

      {/* Main Game Area */}
      <div className="w-full h-full">
        <PoseGame 
          isActive={gameState.status === 'playing'} 
          onCatch={updateScore} 
        />
      </div>

      {/* Overlays */}
      {gameState.status === 'idle' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl flex flex-col items-center justify-center z-[60] p-6 text-center animate-in fade-in duration-700">
          <div className="relative mb-8">
            <div className="absolute -inset-4 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
            <h1 className="relative text-7xl md:text-8xl font-black bg-gradient-to-br from-orange-400 via-yellow-300 to-orange-500 bg-clip-text text-transparent drop-shadow-2xl">
              FRUIT CLAPPER
            </h1>
          </div>
          
          <p className="text-xl text-slate-400 mb-12 max-w-lg leading-relaxed">
            カメラの前で両手を叩いて、<br/>
            降ってくるフルーツを華麗にゲットしよう！
          </p>
          
          <div className="flex flex-col gap-6 w-full max-w-sm">
             <div className="flex items-center gap-5 bg-white/5 p-5 rounded-3xl border border-white/10 text-left">
                <div className="bg-orange-500/20 p-3 rounded-2xl">
                  <span className="text-3xl block transform -rotate-12">👏</span>
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">How to Play</h3>
                  <p className="text-xs text-slate-400">左右の手を合わせるとキャッチ判定が発生します</p>
                </div>
             </div>
             <button 
                onClick={startGame}
                className="group relative overflow-hidden bg-orange-500 hover:bg-orange-400 text-white text-2xl font-black py-5 px-12 rounded-full transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-orange-500/40"
              >
                <span className="relative z-10">GAME START</span>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
          </div>
        </div>
      )}

      {gameState.status === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-3xl flex flex-col items-center justify-center z-[60] p-6 text-center animate-in zoom-in-95 duration-500">
          <div className="mb-2">
            <span className="text-sm font-black tracking-[0.3em] text-red-500 uppercase">Mission Complete</span>
            <h2 className="text-6xl font-black text-white mt-2">TIME'S UP!</h2>
          </div>

          <div className="relative my-10">
            <div className="absolute -inset-8 bg-orange-500 rounded-full blur-[80px] opacity-20 animate-pulse"></div>
            <div className="relative">
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Final Score</p>
              <div className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-orange-400 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
                {gameState.score}
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] mb-12 max-w-md w-full relative group">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 px-4 py-1 rounded-full">
               <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Gemini's Comment</span>
            </div>
            <p className="text-xl text-slate-200 font-medium italic leading-relaxed">
              "{commentary}"
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <button 
              onClick={startGame}
              className="flex-1 bg-white text-slate-950 text-xl font-black py-5 px-10 rounded-full transition-all hover:scale-105 active:scale-95 hover:bg-orange-50 shadow-xl"
            >
              RETRY
            </button>
            <button 
              onClick={goHome}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xl font-black py-5 px-10 rounded-full transition-all border border-white/10 backdrop-blur-md active:scale-95"
            >
              TITLE
            </button>
          </div>
          
          <div className="mt-12 text-slate-500 font-bold tracking-widest text-xs uppercase">
            Best Score: <span className="text-emerald-400">{highScore}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
