'use client';
import { useEffect,useRef } from 'react';

const mathSymbols = ['∑', '∫', '∞', 'π', 'Δ', '√', '≈', 'θ', 'λ', 'μ'];

export default function MathBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: {x:number;y:number;vx:number;vy:number;radius:number;isSymbol:boolean;symbol:string}[] = [];

    const initParticles = () => {
      const width = canvas.width || window.innerWidth;
      const height = canvas.height || window.innerHeight;
      if (width === 0 || height === 0) return; // Prevent division by zero / 0 particles

      const numParticles = Math.floor((width * height) / 10000); 
      const newParticles = [];
      
      for (let i = 0; i < numParticles; i++) {
        newParticles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          radius: Math.random() * 2 + 1,
          isSymbol: Math.random() > 0.8,
          symbol: mathSymbols[Math.floor(Math.random() * mathSymbols.length)]
        });
      }
      particles = newParticles;
    };

    const handleResize = () => {
      if (!canvas) return;
      
      const parent = canvas.parentElement;
      const newWidth = parent ? parent.clientWidth : window.innerWidth;
      const newHeight = parent ? parent.clientHeight : window.innerHeight;
      
      // Prevent infinite resize loops caused by scrollbar toggling
      if (canvas.width === newWidth && canvas.height === newHeight) return;

      canvas.width = newWidth;
      canvas.height = newHeight;
      initParticles();
    };

    // Initialize dimensions
    handleResize();

    // Use ResizeObserver for more reliable dimension tracking
    const observer = new ResizeObserver(() => {
      handleResize();
    });
    
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement);
    } else {
      window.addEventListener('resize', handleResize);
    }

    const animate = () => {
      if (canvas.width === 0 || canvas.height === 0) {
        handleResize();
      }
      
      // Safety net: if particles are missing but canvas has size, initialize them
      if (particles.length === 0 && canvas.width > 0) {
        initParticles();
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = 'rgba(96, 165, 250, 0.8)';
      
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        p.x += p.vx;
        p.y += p.vy;

        // Bouncing logic with safety boundary check
        if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); }
        if (p.x > canvas.width) { p.x = canvas.width; p.vx = -Math.abs(p.vx); }
        if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); }
        if (p.y > canvas.height) { p.y = canvas.height; p.vy = -Math.abs(p.vy); }

        if (p.isSymbol) {
          ctx.font = '16px serif';
          ctx.fillText(p.symbol, p.x, p.y);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      ctx.lineWidth = 1.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 180) {
            const opacity = 1 - (distance / 180);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(96, 165, 250, ${opacity * 0.5})`;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 0, overflow: 'hidden', background: '#070d18',
      pointerEvents: 'none'
    }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', opacity: 0.45 }} />
      
      <div style={{
        position: 'absolute', top: '10%', left: '15%', width: '40vw', height: '40vw',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 60%)',
        borderRadius: '50%', filter: 'blur(60px)', animation: 'pulseAmbient 12s ease-in-out infinite alternate'
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '10%', width: '50vw', height: '50vw',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 60%)',
        borderRadius: '50%', filter: 'blur(60px)', animation: 'pulseAmbient 15s ease-in-out infinite alternate-reverse'
      }} />

      <style>{`
        @keyframes pulseAmbient {
          0% { transform: scale(0.9); opacity: 0.6; }
          100% { transform: scale(1.1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
