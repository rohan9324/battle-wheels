import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import Kart from "./Kart";
import FollowCamera from "../camera/FollowCamera";
import useKeyboardControls from "../controls/KeyboardControls";

import { KARTS } from "../../config/KartConfig";
import { DRIVERS } from "../../config/DriverConfig";

import {
    resolveKartMovement,
    isKartRotationBlocked,
    KART_COLLISION_CONFIG,
} from "../physics/KartCollision";

const SETTINGS = {
    maxSpeed: 24,
    reverseSpeed: 8,
    acceleration: 14,
    braking: 24,
    friction: 5,
    steeringSpeed: 2.2,
};

export default function MultiplayerKart({
    player,
    isLocal,
    movementRef,
    canDrive,
    movementLimit,
}) {

    const kartRef = useRef(null);

    const keys = useKeyboardControls();

    const speed = useRef(
        Number(player.speed) || 0
    );

    const heading = useRef(
        Number(player.rotation) || 0
    );

    const initialized = useRef(false);

    const kart = KARTS.find(
        item => item.id === player.kart_id
    ) || KARTS[0];

    const driver = DRIVERS.find(
        item => item.id === player.driver_id
    ) || DRIVERS[0];

    useFrame((state, delta) => {

        const object = kartRef.current;

        if (!object) return;

        const dt = Math.min(delta, 0.05);

        const targetX = Number(player.position_x);
        const targetZ = Number(player.position_z);
        const targetRotation = Number(player.rotation);

        object.visible = Boolean(player.is_alive);

        if (!initialized.current) {

            object.position.set(
                targetX,
                0,
                targetZ
            );

            heading.current = targetRotation;

            object.rotation.y = targetRotation;

            initialized.current = true;
        }

        // ==================================
        // REMOTE PLAYER SYNCHRONIZATION
        // ==================================

        if (!isLocal) {

            const smoothing =
                1 - Math.exp(-10 * dt);

            object.position.x =
                THREE.MathUtils.lerp(
                    object.position.x,
                    targetX,
                    smoothing
                );

            object.position.z =
                THREE.MathUtils.lerp(
                    object.position.z,
                    targetZ,
                    smoothing
                );

            const difference = Math.atan2(
                Math.sin(
                    targetRotation - object.rotation.y
                ),
                Math.cos(
                    targetRotation - object.rotation.y
                )
            );

            object.rotation.y +=
                difference * smoothing;

            return;
        }

        // ==================================
        // LOCAL PLAYER MOVEMENT
        // ==================================

        if (!canDrive || !player.is_alive) {

            speed.current = 0;

            movementRef.current = null;

            return;
        }

        // Apply server correction when required.

        if (movementRef.current?.correction) {

            const correction =
                movementRef.current.correction;

            object.position.set(
                Number(correction.position_x),
                0,
                Number(correction.position_z)
            );

            heading.current =
                Number(correction.rotation);

            speed.current =
                Number(correction.speed) || 0;
        }

        const input = keys.current;

        if (input.forward && !input.backward) {

            speed.current +=
                (
                    speed.current < 0
                        ? SETTINGS.braking
                        : SETTINGS.acceleration
                ) * dt;

        } else if (
            input.backward &&
            !input.forward
        ) {

            speed.current -=
                (
                    speed.current > 0
                        ? SETTINGS.braking
                        : SETTINGS.acceleration
                ) * dt;

        } else {

            const friction =
                SETTINGS.friction * dt;

            if (speed.current > 0) {

                speed.current = Math.max(
                    0,
                    speed.current - friction
                );

            } else {

                speed.current = Math.min(
                    0,
                    speed.current + friction
                );
            }
        }

        speed.current = THREE.MathUtils.clamp(
            speed.current,
            -SETTINGS.reverseSpeed,
            SETTINGS.maxSpeed
        );

        // ==================================
        // STEERING
        // ==================================

        let steering = 0;

        if (input.left) steering += 1;

        if (input.right) steering -= 1;

        if (
            Math.abs(speed.current) > 0.1 &&
            steering !== 0
        ) {

            const nextHeading =
                heading.current +
                steering *
                SETTINGS.steeringSpeed *
                Math.min(
                    Math.abs(speed.current) / 5,
                    1
                ) *
                Math.sign(speed.current) *
                dt;

            const blocked =
                isKartRotationBlocked(
                    object.position.x,
                    object.position.z,
                    `multiplayer_${player.player_id}`,
                    nextHeading
                );

            if (!blocked) {

                heading.current = nextHeading;
            }
        }

        object.rotation.y = heading.current;

        // ==================================
        // MOVEMENT DIRECTION
        // ==================================

        const nextX =
            object.position.x -
            Math.sin(heading.current) *
            speed.current *
            dt;

        const nextZ =
            object.position.z -
            Math.cos(heading.current) *
            speed.current *
            dt;

        // ==================================
        // MAP COLLISION
        // ==================================

        const movement = resolveKartMovement(
            object.position.x,
            object.position.z,
            nextX,
            nextZ,
            KART_COLLISION_CONFIG.radius,
            `multiplayer_${player.player_id}`,
            heading.current
        );

        object.position.x =
            THREE.MathUtils.clamp(
                movement.x,
                -movementLimit,
                movementLimit
            );

        object.position.z =
            THREE.MathUtils.clamp(
                movement.z,
                -movementLimit,
                movementLimit
            );

        object.position.y = 0;

        if (movement.collided) {

            speed.current *= 0.35;
        }

        // ==================================
        // POSITION FOR BACKEND API
        // ==================================

        movementRef.current = {

            position_x: object.position.x,

            position_z: object.position.z,

            rotation: heading.current,

            speed: speed.current,
        };

        // ==================================
        // WHEEL ANIMATION
        // ==================================

        object.children.forEach(child => {

            if (child.name === "kartWheel") {

                child.rotation.x -=
                    (speed.current / 0.48) * dt;
            }
        });

    });

    return (

        <>

            <Kart
                ref={kartRef}
                color={kart.color}
                helmetColor={driver.helmetColor}
                suitColor={driver.suitColor}
                showWeapon={false}
                showShield={false}
            />

            {isLocal && (

                <FollowCamera target={kartRef} />

            )}

        </>
    );
}