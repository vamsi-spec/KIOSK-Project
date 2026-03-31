import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from 'react-router-dom';
import useStore from "../store/useStore.js";

const IDLE_MS = Number(import.meta.env.VITE_KIOSK_IDLE_TIMEOUT_MS) || 60000;

// Resets the kiosk to idle screen after inactivity
export const useIdleTimer = () => {
  const navigate = useNavigate();
  const { reset } = useStore();
  const timerRef = useRef(null);

  const resetTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      reset();
      navigate('/', { replace: true });
    }, IDLE_MS);
  }, [navigate, reset]);

  useEffect(() => {
    const events = ['touchstart', 'touchmove', 'mousedown', 'mousemove', 'keydown', 'click'];

    events.forEach(e =>
      window.addEventListener(e, resetTimer, { passive: true })
    );

    resetTimer(); // start immediately

    return () => {
      clearTimeout(timerRef.current);
      events.forEach(e =>
        window.removeEventListener(e, resetTimer)
      );
    };
  }, [resetTimer]);
};