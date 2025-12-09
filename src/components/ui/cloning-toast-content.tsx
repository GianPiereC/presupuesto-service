'use client';

import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import type { Toast } from 'react-hot-toast';

interface CloningToastContentProps {
  t: Toast;
}

export default function CloningToastContent({ t }: CloningToastContentProps) {
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    async function loadAnimation() {
      try {
        const response = await fetch('/wait-timer.json');
        const data = await response.json();
        setAnimationData(data);
      } catch (error) {
        console.error('Error loading animation:', error);
      }
    }
    loadAnimation();
  }, []);

  return (
    <div
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-md w-full bg-[var(--card-bg)] border border-[var(--border-color)] shadow-lg rounded-lg pointer-events-auto flex items-center gap-3 p-4`}
    >
      <div className="flex-shrink-0 w-12 h-12">
        {animationData ? (
          <Lottie
            animationData={animationData}
            loop={true}
            autoplay={true}
            style={{ width: 48, height: 48 }}
          />
        ) : (
          <div className="w-12 h-12 bg-[var(--background)] rounded animate-pulse" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          El presupuesto está haciendo una copia, puede tardar unos segundos...
        </p>
      </div>
    </div>
  );
}

