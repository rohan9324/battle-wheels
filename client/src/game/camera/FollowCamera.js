
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ==========================================
// CAMERA SETTINGS
// ==========================================

const CAMERA_SETTINGS = {
    distance: 9,
    height: 4.5,
    lookAhead: 5,
    lookHeight: 1.2,
    positionSmoothness: 10,
    rotationSmoothness: 12,
};

// ==========================================
// THIRD PERSON FOLLOW CAMERA
// ==========================================

export default function FollowCamera({ target }) {

    const initialized = useRef(false);

    const targetPosition = useRef(new THREE.Vector3());
    const targetRotation = useRef(new THREE.Quaternion());

    const cameraOffset = useRef(new THREE.Vector3());
    const desiredPosition = useRef(new THREE.Vector3());

    const lookOffset = useRef(new THREE.Vector3());
    const desiredLookAt = useRef(new THREE.Vector3());
    const currentLookAt = useRef(new THREE.Vector3());

    useFrame(({ camera }, delta) => {

        if (!target.current) return;

        const kart = target.current;

        const dt = Math.min(delta, 0.05);

        // Get current kart position

        kart.getWorldPosition(targetPosition.current);
        kart.getWorldQuaternion(targetRotation.current);

        // Camera stays behind the kart

        cameraOffset.current.set(
            0,
            CAMERA_SETTINGS.height,
            CAMERA_SETTINGS.distance
        );

        cameraOffset.current.applyQuaternion(
            targetRotation.current
        );

        desiredPosition.current
            .copy(targetPosition.current)
            .add(cameraOffset.current);

        // Look ahead in the kart direction

        lookOffset.current.set(
            0,
            CAMERA_SETTINGS.lookHeight,
            -CAMERA_SETTINGS.lookAhead
        );

        lookOffset.current.applyQuaternion(
            targetRotation.current
        );

        desiredLookAt.current
            .copy(targetPosition.current)
            .add(lookOffset.current);

        // Initial camera placement

        if (!initialized.current) {

            camera.position.copy(
                desiredPosition.current
            );

            currentLookAt.current.copy(
                desiredLookAt.current
            );

            initialized.current = true;
        }

        // Smooth camera movement

        const positionAlpha =
            1 - Math.exp(
                -CAMERA_SETTINGS.positionSmoothness * dt
            );

        camera.position.lerp(
            desiredPosition.current,
            positionAlpha
        );

        // Smooth camera rotation

        const rotationAlpha =
            1 - Math.exp(
                -CAMERA_SETTINGS.rotationSmoothness * dt
            );

        currentLookAt.current.lerp(
            desiredLookAt.current,
            rotationAlpha
        );

        camera.lookAt(currentLookAt.current);

    });

    return null;
}
