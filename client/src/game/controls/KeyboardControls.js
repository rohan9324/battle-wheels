
import { useEffect, useRef } from "react";

export default function useKeyboardControls() {
    const keys = useRef({
        forward: false,
        backward: false,
        left: false,
        right: false,
        drift: false,
        fire: false,
        reset: false,
    });

    useEffect(() => {
        const keyMap = {
            KeyW: "forward",
            ArrowUp: "forward",

            KeyS: "backward",
            ArrowDown: "backward",

            KeyA: "left",
            ArrowLeft: "left",

            KeyD: "right",
            ArrowRight: "right",

            ShiftLeft: "drift",
            ShiftRight: "drift",

            Space: "fire",
            KeyR: "reset",
        };

        const pressedKeys = new Set();

        const updateKeys = () => {
            Object.keys(keys.current).forEach((action) => {
                keys.current[action] = false;
            });

            pressedKeys.forEach((code) => {
                const action = keyMap[code];

                if (action) {
                    keys.current[action] = true;
                }
            });
        };

        const handleKeyDown = (event) => {
            if (!keyMap[event.code]) return;

            event.preventDefault();

            pressedKeys.add(event.code);
            updateKeys();
        };

        const handleKeyUp = (event) => {
            if (!keyMap[event.code]) return;

            event.preventDefault();

            pressedKeys.delete(event.code);
            updateKeys();
        };

        const handleBlur = () => {
            pressedKeys.clear();
            updateKeys();
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", handleBlur);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", handleBlur);
        };
    }, []);

    return keys;
}
