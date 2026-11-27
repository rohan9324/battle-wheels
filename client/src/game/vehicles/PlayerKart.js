import { useRef, useEffect } from "react";

import { useFrame } from "@react-three/fiber";

import * as THREE from "three";

import { useGame } from "../../context/GameContext";

import FollowCamera from "../camera/FollowCamera";

import Kart from "./Kart";

import useKeyboardControls from "../controls/KeyboardControls";

import playerState from "../PlayerState";

import {
    registerEntity,
    unregisterEntity,
    createEntity,
} from "../combat/EntityManager";

import {
    respawnEntity,
    requestRespawn,
} from "../combat/RespawnSystem";

import {
    resolveKartMovement,
    isKartRotationBlocked,
    KART_COLLISION_CONFIG,
} from "../physics/KartCollision";

import {
    getMovementMultiplier,
    clearEntityStatus,
} from "../combat/SpecialWeaponSystem";

import matchState from "../match/MatchState";

// ==========================================
// VEHICLE SETTINGS
// ==========================================

const SETTINGS = {
    maxSpeed: 24,

    reverseSpeed: 8,

    acceleration: 14,

    reverseAcceleration: 10,

    braking: 24,

    friction: 5,

    steeringSpeed: 2.2,

    driftSteering: 3.4,

    normalGrip: 12,

    driftGrip: 2.5,

    collisionSpeedLoss: 0.35,

    collisionRadius: KART_COLLISION_CONFIG.radius,

    spawnProtectionDuration: 5000,
};

// ==========================================
// PLAYER KART
// ==========================================

export default function PlayerKart() {

    const {
        selectedKart,
        selectedDriver,
        settings,
    } = useGame();

    const kartRef = useRef();

    const keys = useKeyboardControls();

    const speed = useRef(0);

    const heading = useRef(0);

    const velocity = useRef(
        new THREE.Vector3()
    );

    const direction = useRef(
        new THREE.Vector3()
    );

    const targetVelocity = useRef(
        new THREE.Vector3()
    );

    // ======================================
    // RESET VEHICLE MOVEMENT
    // ======================================

    function stopMovement() {

        speed.current = 0;

        playerState.speed = 0;

        velocity.current.set(0, 0, 0);

        targetVelocity.current.set(0, 0, 0);
    }

    // ======================================
    // CLEAR KEYBOARD INPUTS
    // ======================================

    function clearKeyboardInputs() {

        Object.keys(keys.current).forEach((key) => {

            if (
                typeof keys.current[key] === "boolean"
            ) {
                keys.current[key] = false;
            }

        });
    }

    // ======================================
    // REGISTER PLAYER ENTITY
    // ======================================

    useEffect(() => {

        Object.assign(
            playerState,

            createEntity({
                id: "player",

                name: settings.playerName || "Player",

                isBot: false,
            })
        );

        // RESET OLD SPECIAL WEAPON STATUS

        clearEntityStatus(playerState);

        playerState.maceUntil = 0;

        playerState.object = kartRef.current;

        // FIVE-SECOND INITIAL SPAWN PROTECTION

        playerState.protectedUntil =
            performance.now() +
            SETTINGS.spawnProtectionDuration;

        stopMovement();

        heading.current = 0;

        if (kartRef.current) {

            kartRef.current.position.set(0, 0, 0);

            kartRef.current.rotation.set(0, 0, 0);

            kartRef.current.visible = true;
        }

        registerEntity(playerState);

        return () => {

            clearEntityStatus(playerState);

            unregisterEntity(
                playerState.id,
                playerState
            );

            playerState.object = null;
        };

    }, [settings.playerName]);

    // ======================================
    // MANUAL RESPAWN KEYBOARD LISTENER
    // ======================================

    useEffect(() => {

        function handleRespawnKey(event) {

            // MATCH MUST BE RUNNING

            if (matchState.status !== "playing") {
                return;
            }

            // PLAYER MUST BE ELIMINATED

            if (playerState.alive) {
                return;
            }

            // IGNORE HELD KEYBOARD KEYS

            if (event.repeat) {
                return;
            }

            // WAIT FOR RESPAWN COUNTDOWN

            if (
                performance.now() <
                playerState.respawnAt
            ) {
                return;
            }

            // IGNORE BROWSER SHORTCUTS

            if (
                event.ctrlKey ||
                event.altKey ||
                event.metaKey
            ) {
                return;
            }

            if (
                [
                    "Escape",
                    "Tab",
                    "F5",
                    "F11",
                    "F12",
                ].includes(event.key)
            ) {
                return;
            }

            // IGNORE TYPING INSIDE FORM FIELDS

            if (
                event.target instanceof HTMLElement &&
                event.target.closest(
                    "input, textarea, button, select, [contenteditable]"
                )
            ) {
                return;
            }

            event.preventDefault();

            requestRespawn(playerState);
        }

        window.addEventListener(
            "keydown",
            handleRespawnKey
        );

        return () => {

            window.removeEventListener(
                "keydown",
                handleRespawnKey
            );
        };

    }, []);

    // ======================================
    // GAME LOOP
    // ======================================

    useFrame((state, delta) => {

        if (!kartRef.current) return;

        const kart = kartRef.current;

        const input = keys.current;

        const dt = Math.min(delta, 0.05);

        if (dt <= 0) return;

        // ==================================
        // MATCH STATUS
        // ==================================

        if (matchState.status !== "playing") {

            stopMovement();

            return;
        }

        // ==================================
        // PLAYER DEATH AND MANUAL RESPAWN
        // ==================================

        if (!playerState.alive) {

            stopMovement();

            clearEntityStatus(playerState);

            playerState.maceUntil = 0;

            kart.visible = false;

            // WAIT FOR MANUAL RESPAWN REQUEST

            if (!playerState.respawnRequested) {
                return;
            }

            const respawned =
                respawnEntity(playerState);

            if (respawned) {

                clearEntityStatus(playerState);

                playerState.maceUntil = 0;

                heading.current =
                    playerState.rotation;

                stopMovement();

                kart.position.set(
                    playerState.x,
                    0,
                    playerState.z
                );

                kart.rotation.set(
                    0,
                    playerState.rotation,
                    0
                );

                kart.visible = true;

                clearKeyboardInputs();
            }

            return;
        }

        // ==================================
        // SPECIAL WEAPON MOVEMENT EFFECTS
        // ==================================

        const movementMultiplier =
            getMovementMultiplier(playerState);

        // ==================================
        // ELECTRIC BLASTER STUN
        // ==================================

        if (movementMultiplier <= 0) {

            stopMovement();

            input.reset = false;

            playerState.x = kart.position.x;

            playerState.z = kart.position.z;

            playerState.rotation = heading.current;

            return;
        }

        // ==================================
        // ICE ROCKET SPEED REDUCTION
        // ==================================

        const effectiveMaxSpeed =
            SETTINGS.maxSpeed *
            movementMultiplier;

        const effectiveReverseSpeed =
            SETTINGS.reverseSpeed *
            movementMultiplier;

        const effectiveAcceleration =
            SETTINGS.acceleration *
            movementMultiplier;

        const effectiveReverseAcceleration =
            SETTINGS.reverseAcceleration *
            movementMultiplier;

        // ==================================
        // SAFE KART RESET
        // ==================================

        if (input.reset) {

            const resetX = 0;

            const resetZ = 0;

            const resetRotation = 0;

            // CHECK ACTUAL RECTANGULAR KART BODY
            // AGAINST MAP OBJECTS AND OTHER KARTS

            const resetBlocked =
                isKartRotationBlocked(
                    resetX,
                    resetZ,
                    playerState.id,
                    resetRotation
                );

            if (!resetBlocked) {

                kart.position.set(
                    resetX,
                    0,
                    resetZ
                );

                kart.rotation.set(
                    0,
                    resetRotation,
                    0
                );

                stopMovement();

                heading.current = resetRotation;

                playerState.x = resetX;

                playerState.z = resetZ;

                playerState.rotation = resetRotation;
            }

            input.reset = false;

            return;
        }

        // ==================================
        // ACCELERATION AND BRAKING
        // ==================================

        if (
            input.forward &&
            !input.backward
        ) {

            const acceleration =
                speed.current < 0
                    ? SETTINGS.braking
                    : effectiveAcceleration;

            speed.current += acceleration * dt;

        } else if (
            input.backward &&
            !input.forward
        ) {

            const acceleration =
                speed.current > 0
                    ? SETTINGS.braking
                    : effectiveReverseAcceleration;

            speed.current -= acceleration * dt;

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

        // ==================================
        // DYNAMIC SPEED LIMIT
        // ==================================

        speed.current = THREE.MathUtils.clamp(
            speed.current,
            -effectiveReverseSpeed,
            effectiveMaxSpeed
        );

        // ==================================
        // STEERING INPUT
        // ==================================

        let steering = 0;

        if (input.left) steering += 1;

        if (input.right) steering -= 1;

        const isDrifting =
            input.drift &&
            Math.abs(speed.current) > 5;

        const steeringSpeed = isDrifting
            ? SETTINGS.driftSteering
            : SETTINGS.steeringSpeed;

        const steeringFactor = Math.min(
            Math.abs(speed.current) / 5,
            1
        );

        // ==================================
        // ACCURATE AND SAFE KART ROTATION
        // ==================================

        if (
            Math.abs(speed.current) > 0.1 &&
            steering !== 0
        ) {

            const rotationAmount =
                steering *
                steeringSpeed *
                steeringFactor *
                Math.sign(speed.current) *
                dt;

            // Divide rotation into small steps.
            // Prevent kart corners from entering
            // nearby objects while turning.

            const rotationSteps = Math.max(
                1,
                Math.ceil(
                    Math.abs(rotationAmount) / 0.025
                )
            );

            const rotationStep =
                rotationAmount / rotationSteps;

            for (
                let index = 0;
                index < rotationSteps;
                index++
            ) {

                const nextHeading =
                    heading.current + rotationStep;

                const rotationBlocked =
                    isKartRotationBlocked(
                        kart.position.x,
                        kart.position.z,
                        playerState.id,
                        nextHeading
                    );

                if (rotationBlocked) {
                    break;
                }

                heading.current = nextHeading;
            }
        }

        kart.rotation.y = heading.current;

        // ==================================
        // MOVEMENT DIRECTION
        // ==================================

        direction.current.set(
            -Math.sin(heading.current),
            0,
            -Math.cos(heading.current)
        );

        targetVelocity.current
            .copy(direction.current)
            .multiplyScalar(speed.current);

        // ==================================
        // NORMAL GRIP AND DRIFT
        // ==================================

        const grip = isDrifting
            ? SETTINGS.driftGrip
            : SETTINGS.normalGrip;

        const smoothing =
            1 - Math.exp(-grip * dt);

        velocity.current.lerp(
            targetVelocity.current,
            smoothing
        );

        // ==================================
        // ENFORCE ICE ROCKET SPEED LIMIT
        // ==================================

        if (movementMultiplier < 1) {

            const currentVelocity =
                velocity.current.length();

            const allowedSpeed =
                speed.current < 0
                    ? effectiveReverseSpeed
                    : effectiveMaxSpeed;

            if (
                currentVelocity > allowedSpeed &&
                currentVelocity > 0.000001
            ) {

                velocity.current.multiplyScalar(
                    allowedSpeed / currentVelocity
                );
            }
        }

        // ==================================
        // SAVE CURRENT POSITION
        // ==================================

        const currentX = kart.position.x;

        const currentZ = kart.position.z;

        // ==================================
        // CALCULATE TARGET POSITION
        // ==================================

        const targetX =
            currentX + velocity.current.x * dt;

        const targetZ =
            currentZ + velocity.current.z * dt;

        // ==================================
        // ACCURATE RECTANGULAR COLLISION
        // ==================================

        const movement = resolveKartMovement(
            currentX,
            currentZ,
            targetX,
            targetZ,
            SETTINGS.collisionRadius,
            playerState.id,
            heading.current
        );

        // ==================================
        // APPLY SAFE POSITION
        // ==================================

        kart.position.x = movement.x;

        kart.position.z = movement.z;

        kart.position.y = 0;

        // ==================================
        // HANDLE COLLISION RESPONSE
        // ==================================

        if (movement.collided) {

            const movedX =
                movement.x - currentX;

            const movedZ =
                movement.z - currentZ;

            const movedDistance = Math.hypot(
                movedX,
                movedZ
            );

            // STOP WHEN COMPLETELY BLOCKED

            if (movedDistance < 0.001) {

                stopMovement();

            } else {

                // PRESERVE SAFE SLIDING MOVEMENT

                velocity.current.set(
                    movedX / dt,
                    0,
                    movedZ / dt
                );

                speed.current *=
                    SETTINGS.collisionSpeedLoss;
            }
        }

        // ==================================
        // MAP BOUNDARY
        // ==================================

        // Boundary collision is now handled
        // by resolveKartMovement().
        //
        // Do not apply another fixed movement
        // limit here because it can stop the kart
        // before reaching the actual wall.

        // ==================================
        // UPDATE LIVE PLAYER STATE
        // ==================================

        playerState.x = kart.position.x;

        playerState.z = kart.position.z;

        playerState.rotation = heading.current;

        playerState.speed = speed.current;

        // ==================================
        // WHEEL ROTATION
        // ==================================

        kart.children.forEach((child) => {

            if (child.name === "kartWheel") {

                child.rotation.x -=
                    (speed.current / 0.48) * dt;
            }

        });

    });

    // ======================================
    // RENDER PLAYER KART
    // ======================================

    return (

        <>

            <Kart
                ref={kartRef}
                position={[0, 0, 0]}
                color={selectedKart.color}
                helmetColor={selectedDriver.helmetColor}
                suitColor={selectedDriver.suitColor}
                entity={playerState}
            />

            <FollowCamera target={kartRef} />

        </>
    );
}