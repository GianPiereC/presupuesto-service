"use client";

import Lottie from 'lottie-react';
import spinnerAnimation from '@/assets/loading-spinner.json';

interface LoadingSpinnerProps {
  size?: number;
  fullScreen?: boolean;
  className?: string;
  showText?: boolean;
  text?: string;
}

export default function LoadingSpinner({ 
  size = 100, 
  fullScreen = false,
  className = "",
  showText = false,
  text = "Cargando..."
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Lottie 
        animationData={spinnerAnimation} 
        loop={true}
        autoplay={true}
        style={{ width: size, height: size }}
        rendererSettings={{
          preserveAspectRatio: 'xMidYMid slice'
        }}
      />
      {showText && (
        <p className="mt-4 text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}

