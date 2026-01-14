
import React, { useRef, useEffect, useState } from 'react';
import { Fruit, FRUIT_TYPES, Point } from '../types';

interface PoseGameProps {
  isActive: boolean;
  onCatch: (points: number) => void;
}

const PoseGame: React.FC<PoseGameProps> = ({ isActive, onCatch }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fruitsRef = useRef<Fruit[]>([]);
  const lastSpawnRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const poseRef = useRef<{leftHand: Point | null, rightHand: Point | null}>({ leftHand: null, rightHand: null });
  const [loading, setLoading] = useState(true);

  // Initialize Camera and Load MediaPipe
  useEffect(() => {
    const initPoseDetection = async () => {
      try {
        // Load scripts dynamically
        const tfScript = document.createElement('script');
        tfScript.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core";
        const tfConvertScript = document.createElement('script');
        tfConvertScript.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-converter";
        const tfBackendScript = document.createElement('script');
        tfBackendScript.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl";
        const poseScript = document.createElement('script');
        poseScript.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection";

        document.head.appendChild(tfScript);
        document.head.appendChild(tfConvertScript);
        document.head.appendChild(tfBackendScript);
        
        await new Promise(resolve => {
          tfBackendScript.onload = () => {
            document.head.appendChild(poseScript);
            poseScript.onload = resolve;
          }
        });

        // Initialize Detector
        const detectorConfig = {
          runtime: 'tfjs',
          modelType: 'lite'
        };
        // @ts-ignore
        const detector = await window.poseDetection.createDetector(window.poseDetection.SupportedModels.MoveNet, detectorConfig);

        // Setup Webcam
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, frameRate: 30 }, 
            audio: false 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setLoading(false);
            gameLoop(detector);
          };
        }
      } catch (err) {
        console.error("Error initializing camera or pose detection:", err);
      }
    };

    initPoseDetection();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gameLoop = async (detector: any) => {
    const process = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Sync canvas size
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // 1. Detect Poses
      const poses = await detector.estimatePoses(video);
      if (poses.length > 0) {
        const keypoints = poses[0].keypoints;
        const leftWrist = keypoints.find((kp: any) => kp.name === 'left_wrist');
        const rightWrist = keypoints.find((kp: any) => kp.name === 'right_wrist');
        
        poseRef.current = {
          leftHand: leftWrist && leftWrist.score > 0.3 ? { x: leftWrist.x, y: leftWrist.y } : null,
          rightHand: rightWrist && rightWrist.score > 0.3 ? { x: rightWrist.x, y: rightWrist.y } : null,
        };
      } else {
        poseRef.current = { leftHand: null, rightHand: null };
      }

      // 2. Clear & Draw Video (Mirrored)
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Draw Hand Indicators (Visual Feedback)
      drawHands(ctx, canvas.width);

      if (isActive) {
        updateAndDrawFruits(ctx, canvas.width, canvas.height);
        checkClapCollision(canvas.width);
      }

      animationFrameRef.current = requestAnimationFrame(process);
    };

    process();
  };

  const drawHands = (ctx: CanvasRenderingContext2D, width: number) => {
    const { leftHand, rightHand } = poseRef.current;
    
    // Draw circles for hands (mirrored coordinate system)
    [leftHand, rightHand].forEach((hand, idx) => {
      if (hand) {
        const mirroredX = width - hand.x;
        ctx.beginPath();
        ctx.arc(mirroredX, hand.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = idx === 0 ? 'rgba(59, 130, 246, 0.6)' : 'rgba(239, 68, 68, 0.6)';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // Draw connection if hands are close
    if (leftHand && rightHand) {
      const dist = Math.sqrt(Math.pow(leftHand.x - rightHand.x, 2) + Math.pow(leftHand.y - rightHand.y, 2));
      if (dist < 80) {
        const midX = width - (leftHand.x + rightHand.x) / 2;
        const midY = (leftHand.y + rightHand.y) / 2;
        ctx.beginPath();
        ctx.arc(midX, midY, 60, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  };

  const updateAndDrawFruits = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Spawn fruits
    const now = Date.now();
    if (now - lastSpawnRef.current > 1200) {
      const type = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
      const newFruit: Fruit = {
        id: Math.random().toString(36).substr(2, 9),
        x: Math.random() * (width - 100) + 50,
        y: -50,
        speed: Math.random() * 2 + 2,
        emoji: type.emoji,
        points: type.points,
        radius: 30
      };
      fruitsRef.current.push(newFruit);
      lastSpawnRef.current = now;
    }

    // Update positions
    fruitsRef.current = fruitsRef.current.filter(fruit => {
      fruit.y += fruit.speed;
      
      // Draw fruit (Mirror compensation: fruit.x is already generated in "canvas space")
      ctx.font = '40px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fruit.emoji, fruit.x, fruit.y);

      return fruit.y < height + 100;
    });
  };

  const checkClapCollision = (width: number) => {
    const { leftHand, rightHand } = poseRef.current;
    if (!leftHand || !rightHand) return;

    // A "clap" is when hands are close
    const handDist = Math.sqrt(Math.pow(leftHand.x - rightHand.x, 2) + Math.pow(leftHand.y - rightHand.y, 2));
    if (handDist < 80) {
      const clapX = width - (leftHand.x + rightHand.x) / 2;
      const clapY = (leftHand.y + rightHand.y) / 2;

      // Check if any fruit is near the clap point
      fruitsRef.current = fruitsRef.current.filter(fruit => {
        const distToClap = Math.sqrt(Math.pow(fruit.x - clapX, 2) + Math.pow(fruit.y - clapY, 2));
        if (distToClap < 60) {
          onCatch(fruit.points);
          createPopEffect(clapX, clapY);
          return false; // Remove caught fruit
        }
        return true;
      });
    }
  };

  const createPopEffect = (x: number, y: number) => {
    // Basic visual feedback could be added here if needed
  };

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-black">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-white text-lg font-medium">AIモデル読込中...</p>
        </div>
      )}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain shadow-2xl border-4 border-slate-800 rounded-3xl"
      />
      
      {/* Visual Instruction Overlay */}
      {isActive && !loading && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/20">
          <p className="text-white font-bold text-sm tracking-wide">
             👏 両手を合わせるとフルーツをキャッチ！
          </p>
        </div>
      )}
    </div>
  );
};

export default PoseGame;
