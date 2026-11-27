import {
    useRef,
    useEffect,
    useMemo,
} from "react";

import { useFrame } from "@react-three/fiber";

import { Html } from "@react-three/drei";

import * as THREE from "three";

import Kart from "../vehicles/Kart";

import {
    ARENA_CONFIG,
} from "../maps/ArenaConfig";

import {
    createEntity,
    registerEntity,
    unregisterEntity,
} from "../combat/EntityManager";

import {
    respawnEntity,
} from "../combat/RespawnSystem";

import {
    resolveKartMovement,
    isKartRotationBlocked,
    KART_COLLISION_CONFIG,
} from "../physics/KartCollision";

import {
    getMovementMultiplier,
    clearEntityStatus,
    canEntityFire,
} from "../combat/SpecialWeaponSystem";

import {
    getBotTarget,
    updateBotSteering,
    updateBotCombat,
    hasClearShot,
    normalizeAngle,
} from "./BotAI";

import matchState from "../match/MatchState";

// ==========================================
// BOT MOVEMENT SETTINGS
// ==========================================

const BOT_MOVEMENT = {

    // Used only for selecting safe AI targets.
    // Actual movement boundaries are handled
    // by the central collision system.

    get mapLimit() {
        return ARENA_CONFIG.movementLimit;
    },

    decisionInterval: 200,

    defaultMaxSpeed: 20,

    explorationSpeed: 0.85,

    escapeSpeed: 0.65,

    acceleration: 5,

    braking: 10,

    reverseSpeed: 7,

    pickupSlowDistance: 8,

    pickupSpeed: 6,

    attackRange: 45,

    grenadeAttackRange: 18,

    minimumAttackDistance: 5,

    preferredAttackDistance: 12,

    aimSpeed: 4,

    collisionRadius: KART_COLLISION_CONFIG.radius,

    collisionSpeedLoss: 0.35,

    rotationStep: 0.025,

    stuckDuration: 0.75,

    recoveryDuration: 1100,

    recoverySteering: 2.2,
};

// ==========================================
// SAFE BOT ROTATION
// ==========================================

function resolveBotRotation(
    bot,
    previousRotation,
    targetRotation
) {

    const rotationDifference =
        normalizeAngle(
            targetRotation - previousRotation
        );

    if (
        Math.abs(rotationDifference) < 0.000001
    ) {

        return {
            rotation: previousRotation,
            blocked: false,
        };
    }

    const steps = Math.max(
        1,
        Math.ceil(
            Math.abs(rotationDifference) /
            BOT_MOVEMENT.rotationStep
        )
    );

    const step =
        rotationDifference / steps;

    let safeRotation = previousRotation;

    let blocked = false;

    for (let index = 0; index < steps; index++) {

        const nextRotation =
            normalizeAngle(
                safeRotation + step
            );

        const rotationBlocked =
            isKartRotationBlocked(
                bot.x,
                bot.z,
                bot.id,
                nextRotation
            );

        if (rotationBlocked) {

            blocked = true;

            break;
        }

        safeRotation = nextRotation;
    }

    return {

        rotation: normalizeAngle(
            safeRotation
        ),

        blocked,
    };
}

// ==========================================
// MAIN BOT KART
// ==========================================

export default function BotKart({ config }) {

    const kartRef = useRef();

    const healthRef = useRef();

    const labelRef = useRef();

    const targetRef = useRef(null);

    const nextDecision = useRef(0);

    const stuckTime = useRef(0);

    const recoveryUntil = useRef(0);

    const recoveryDirection = useRef(1);

    const wasStunned = useRef(false);

    const bot = useMemo(

        () => createEntity({

            id: config.id,

            name: config.name,

            isBot: true,

        }),

        [config.id, config.name]
    );

    // ======================================
    // RESET BOT AI
    // ======================================

    function resetBotAI() {

        targetRef.current = null;

        nextDecision.current = 0;

        stuckTime.current = 0;

        recoveryUntil.current = 0;

        wasStunned.current = false;

        bot.aiExploreTarget = null;

        bot.aiEscapeTarget = null;

        bot.aiLastPosition = null;

        bot.speed = 0;
    }

    // ======================================
    // REGISTER BOT ENTITY
    // ======================================

    useEffect(() => {

        clearEntityStatus(bot);

        bot.maceUntil = 0;

        bot.object = kartRef.current;

        bot.alive = false;

        bot.respawnAt = 0;

        bot.speed = 0;

        bot.aiState = "WAITING";

        resetBotAI();

        if (bot.object) {

            bot.object.visible = false;
        }

        registerEntity(bot);

        return () => {

            clearEntityStatus(bot);

            unregisterEntity(
                bot.id,
                bot
            );

            bot.object = null;
        };

    }, [bot]);

    // ======================================
    // BOT GAME LOOP
    // ======================================

    useFrame(({ scene }, delta) => {

        const kart = kartRef.current;

        if (!kart) return;

        // ==================================
        // CHECK MATCH STATUS
        // ==================================

        if (matchState.status !== "playing") {

            bot.speed = 0;

            return;
        }

        const now = performance.now();

        const dt = Math.min(delta, 0.05);

        if (dt <= 0) return;

        const maxSpeed =
            config.maxSpeed ||
            BOT_MOVEMENT.defaultMaxSpeed;

        // ==================================
        // SPAWN AND AUTOMATIC RESPAWN
        // ==================================

        if (!bot.alive) {

            bot.speed = 0;

            clearEntityStatus(bot);

            bot.maceUntil = 0;

            kart.visible = false;

            if (labelRef.current) {

                labelRef.current.style.display =
                    "none";
            }

            if (respawnEntity(bot)) {

                clearEntityStatus(bot);

                bot.maceUntil = 0;

                resetBotAI();

                bot.aiState = "SEARCH_WEAPON";

                bot.nextFireAt = now + 1500;

                kart.position.set(
                    bot.x,
                    0,
                    bot.z
                );

                kart.rotation.y = bot.rotation;

                kart.visible = true;
            }

            return;
        }

        kart.visible = true;

        // ==================================
        // UPDATE BOT HEALTH LABEL
        // ==================================

        if (labelRef.current) {

            labelRef.current.style.display =
                "block";
        }

        if (healthRef.current) {

            const healthPercentage =
                THREE.MathUtils.clamp(
                    (
                        bot.health /
                        (bot.maxHealth || 100)
                    ) * 100,
                    0,
                    100
                );

            healthRef.current.style.width =
                `${healthPercentage}%`;

            healthRef.current.style.background =
                healthPercentage > 50
                    ? "#39e75f"
                    : healthPercentage > 25
                        ? "#ffc340"
                        : "#ff3535";
        }

        // ==================================
        // SPECIAL WEAPON MOVEMENT EFFECTS
        // ==================================

        const movementMultiplier =
            THREE.MathUtils.clamp(
                getMovementMultiplier(bot),
                0,
                1
            );

        // ==================================
        // ELECTRIC BLASTER STUN
        // ==================================

        if (movementMultiplier <= 0) {

            bot.speed = 0;

            bot.aiState = "STUNNED";

            wasStunned.current = true;

            stuckTime.current = 0;

            recoveryUntil.current = 0;

            nextDecision.current = 0;

            return;
        }

        // ==================================
        // RESUME AI AFTER STUN
        // ==================================

        if (wasStunned.current) {

            resetBotAI();

            bot.aiState = bot.weapon
                ? "CHASE"
                : "SEARCH_WEAPON";
        }

        // ==================================
        // ICE ROCKET SPEED SETTINGS
        // ==================================

        const effectiveMaxSpeed =
            maxSpeed *
            movementMultiplier;

        const effectiveReverseSpeed =
            BOT_MOVEMENT.reverseSpeed *
            movementMultiplier;

        const effectiveAcceleration =
            BOT_MOVEMENT.acceleration *
            movementMultiplier;

        bot.speed = THREE.MathUtils.clamp(
            bot.speed,
            -effectiveReverseSpeed,
            effectiveMaxSpeed
        );

        // ==================================
        // SELECT NEW AI TARGET
        // ==================================

        const isRecovering =
            now < recoveryUntil.current;

        if (
            !isRecovering &&
            now >= nextDecision.current
        ) {

            targetRef.current =
                getBotTarget(bot);

            nextDecision.current =
                now +
                BOT_MOVEMENT.decisionInterval;
        }

        const target = targetRef.current;

        // ==================================
        // NO AVAILABLE TARGET
        // ==================================

        if (!target && !isRecovering) {

            bot.speed = 0;

            nextDecision.current = 0;

            return;
        }

        // ==================================
        // UPDATE LIVE ENEMY TARGET
        // ==================================

        let enemy = null;

        if (target?.type === "enemy") {

            enemy = target.entity;

            if (!enemy || !enemy.alive) {

                targetRef.current = null;

                nextDecision.current = 0;

                bot.speed = 0;

                return;
            }

            target.x = enemy.x;

            target.z = enemy.z;
        }

        const distance = target
            ? Math.hypot(
                target.x - bot.x,
                target.z - bot.z
            )
            : Infinity;

        let targetSpeed = maxSpeed;

        let angleDifference = 0;

        // Save original rotation before AI
        // calculates the next direction.

        const previousRotation =
            bot.rotation;

        // ==================================
        // RECOVERY MODE
        // ==================================

        if (isRecovering) {

            bot.aiState = "RECOVER";

            bot.rotation +=
                recoveryDirection.current *
                dt *
                BOT_MOVEMENT.recoverySteering;

            targetSpeed =
                -BOT_MOVEMENT.reverseSpeed;

        } else {

            // ==============================
            // DETERMINE WEAPON ATTACK RANGE
            // ==============================

            const attackRange =
                bot.weapon?.type === "grenade" ||
                bot.weapon?.type === "poison"
                    ? BOT_MOVEMENT.grenadeAttackRange
                    : Math.min(
                        BOT_MOVEMENT.attackRange,
                        bot.weapon?.maxRange ??
                        Infinity
                    );

            // ==============================
            // CHECK WHETHER BOT CAN AIM
            // ==============================

            const canAim = Boolean(

                enemy &&

                bot.weapon &&

                bot.ammo > 0 &&

                !bot.firing &&

                canEntityFire(bot) &&

                now >=
                (enemy.protectedUntil || 0) &&

                distance >=
                BOT_MOVEMENT.minimumAttackDistance &&

                distance <= attackRange &&

                hasClearShot(
                    scene,
                    bot,
                    enemy
                )
            );

            // ==============================
            // AIM AND ATTACK ENEMY
            // ==============================

            if (canAim) {

                bot.aiState = "AIM";

                angleDifference =
                    updateBotSteering(
                        bot,
                        target,
                        dt,
                        true
                    );

                targetSpeed =
                    distance <
                    BOT_MOVEMENT.preferredAttackDistance
                        ? 0
                        : BOT_MOVEMENT.aimSpeed;

                if (angleDifference > 0.65) {

                    targetSpeed = 0;
                }

            // ==============================
            // ENEMY TOO CLOSE: MOVE AWAY
            // ==============================

            } else if (

                enemy &&

                distance <
                BOT_MOVEMENT.minimumAttackDistance

            ) {

                bot.aiState = "EVADE";

                const dx = bot.x - enemy.x;

                const dz = bot.z - enemy.z;

                const length =
                    Math.hypot(dx, dz) || 1;

                const escapeTarget = {

                    type: "explore",

                    x: THREE.MathUtils.clamp(
                        bot.x +
                        (dx / length) * 15,
                        -BOT_MOVEMENT.mapLimit,
                        BOT_MOVEMENT.mapLimit
                    ),

                    z: THREE.MathUtils.clamp(
                        bot.z +
                        (dz / length) * 15,
                        -BOT_MOVEMENT.mapLimit,
                        BOT_MOVEMENT.mapLimit
                    ),
                };

                angleDifference =
                    updateBotSteering(
                        bot,
                        escapeTarget,
                        dt,
                        false
                    );

                targetSpeed =
                    maxSpeed * 0.65;

            } else {

                // ==========================
                // NORMAL AI STEERING
                // ==========================

                angleDifference =
                    updateBotSteering(
                        bot,
                        target,
                        dt,
                        false
                    );

                // ==========================
                // ESCAPE OBSTACLE
                // ==========================

                if (bot.aiState === "ESCAPE") {

                    targetSpeed =
                        maxSpeed *
                        BOT_MOVEMENT.escapeSpeed;

                // ==========================
                // SEARCH WEAPON
                // ==========================

                } else if (
                    target.type === "pickup"
                ) {

                    bot.aiState = "SEARCH_WEAPON";

                    targetSpeed = maxSpeed;

                    if (
                        distance <
                        BOT_MOVEMENT.pickupSlowDistance
                    ) {

                        targetSpeed =
                            BOT_MOVEMENT.pickupSpeed;
                    }

                // ==========================
                // EXPLORE OPEN MAP
                // ==========================

                } else if (
                    target.type === "explore"
                ) {

                    bot.aiState = "EXPLORE";

                    targetSpeed =
                        maxSpeed *
                        BOT_MOVEMENT.explorationSpeed;

                    if (distance < 6) {

                        targetSpeed = 0;

                        nextDecision.current = 0;
                    }

                // ==========================
                // CHASE ENEMY
                // ==========================

                } else if (
                    target.type === "enemy"
                ) {

                    bot.aiState = "CHASE";

                    targetSpeed = maxSpeed;

                    if (distance < 15) {

                        targetSpeed =
                            maxSpeed * 0.55;
                    }
                }
            }

            // ==============================
            // SLOW DOWN DURING SHARP TURNS
            // ==============================

            if (angleDifference > 1.8) {

                targetSpeed = 0;

            } else if (angleDifference > 1.2) {

                targetSpeed = Math.min(
                    targetSpeed,
                    3
                );

            } else if (angleDifference > 0.8) {

                targetSpeed = Math.min(
                    targetSpeed,
                    maxSpeed * 0.45
                );
            }
        }

        // ==================================
        // ACCURATE AND SAFE BOT ROTATION
        // ==================================

        const desiredRotation =
            normalizeAngle(bot.rotation);

        const rotationResult =
            resolveBotRotation(
                bot,
                previousRotation,
                desiredRotation
            );

        bot.rotation =
            rotationResult.rotation;

        const rotationBlocked =
            rotationResult.blocked;

        // ==================================
        // HANDLE BLOCKED ROTATION
        // ==================================

        if (rotationBlocked) {

            if (!isRecovering) {

                targetSpeed =
                    -BOT_MOVEMENT.reverseSpeed *
                    0.6;

                nextDecision.current = 0;
            }
        }

        // ==================================
        // APPLY SPECIAL WEAPON SPEED EFFECT
        // ==================================

        targetSpeed *= movementMultiplier;

        targetSpeed = THREE.MathUtils.clamp(
            targetSpeed,
            -effectiveReverseSpeed,
            effectiveMaxSpeed
        );

        // ==================================
        // SMOOTH ACCELERATION AND BRAKING
        // ==================================

        const acceleration =
            Math.abs(targetSpeed) <
            Math.abs(bot.speed)
                ? BOT_MOVEMENT.braking
                : effectiveAcceleration;

        bot.speed = THREE.MathUtils.lerp(
            bot.speed,
            targetSpeed,
            1 - Math.exp(-acceleration * dt)
        );

        bot.speed = THREE.MathUtils.clamp(
            bot.speed,
            -effectiveReverseSpeed,
            effectiveMaxSpeed
        );

        if (
            targetSpeed === 0 &&
            Math.abs(bot.speed) < 0.1
        ) {

            bot.speed = 0;
        }

        // ==================================
        // SAVE PREVIOUS POSITION
        // ==================================

        const oldX = bot.x;

        const oldZ = bot.z;

        // ==================================
        // CALCULATE TARGET MOVEMENT
        // ==================================

        const targetX =
            bot.x -
            Math.sin(bot.rotation) *
            bot.speed *
            dt;

        const targetZ =
            bot.z -
            Math.cos(bot.rotation) *
            bot.speed *
            dt;

        // ==================================
        // ACCURATE RECTANGULAR COLLISION
        // ==================================

        const movement = resolveKartMovement(
            bot.x,
            bot.z,
            targetX,
            targetZ,
            BOT_MOVEMENT.collisionRadius,
            bot.id,
            bot.rotation
        );

        // ==================================
        // APPLY SAFE MOVEMENT
        // ==================================

        bot.x = movement.x;

        bot.z = movement.z;

        // ==================================
        // MAP BOUNDARY
        // ==================================

        // Do not apply an additional fixed
        // boundary clamp here.
        //
        // resolveKartMovement() already checks
        // actual kart dimensions and boundaries.

        // ==================================
        // CALCULATE ACTUAL MOVEMENT
        // ==================================

        const movedDistance = Math.hypot(
            bot.x - oldX,
            bot.z - oldZ
        );

        // ==================================
        // HANDLE COLLISION RESPONSE
        // ==================================

        const collided = movement.collided;

        if (collided) {

            // Completely blocked.

            if (movedDistance < 0.001) {

                bot.speed = 0;

            } else {

                // Preserve safe sliding movement.

                bot.speed *=
                    BOT_MOVEMENT.collisionSpeedLoss;
            }

            // Ask AI to calculate a new route.

            if (!isRecovering) {

                nextDecision.current = 0;
            }
        }

        // ==================================
        // DETECT STUCK BOT
        // ==================================

        const intentionallyStopped =
            !rotationBlocked && (

                bot.aiState === "AIM" ||

                bot.aiState === "ATTACK" ||

                bot.firing ||

                Math.abs(targetSpeed) < 1
            );

        const stuckMovementThreshold =
            dt *
            1.5 *
            movementMultiplier;

        const stuckSpeedThreshold =
            4 *
            movementMultiplier;

        if (

            !isRecovering &&

            !intentionallyStopped &&

            (
                rotationBlocked ||

                Math.abs(targetSpeed) >
                stuckSpeedThreshold
            ) &&

            movedDistance <
            stuckMovementThreshold

        ) {

            stuckTime.current += dt;

        } else {

            stuckTime.current = 0;
        }

        // ==================================
        // START RECOVERY IF STUCK
        // ==================================

        if (

            stuckTime.current >
            BOT_MOVEMENT.stuckDuration &&

            now >= recoveryUntil.current

        ) {

            recoveryUntil.current =
                now +
                BOT_MOVEMENT.recoveryDuration;

            recoveryDirection.current =
                Math.random() > 0.5
                    ? 1
                    : -1;

            bot.aiState = "RECOVER";

            bot.aiExploreTarget = null;

            bot.aiEscapeTarget = null;

            nextDecision.current = 0;

            stuckTime.current = 0;
        }

        // ==================================
        // APPLY KART TRANSFORM
        // ==================================

        kart.position.set(
            bot.x,
            0,
            bot.z
        );

        kart.rotation.y = bot.rotation;

        // ==================================
        // AUTOMATIC WEAPON FIRING
        // ==================================

        if (

            enemy &&

            enemy.alive &&

            now >= recoveryUntil.current &&

            bot.aiState !== "EVADE" &&

            canEntityFire(bot)

        ) {

            updateBotCombat(
                scene,
                bot,
                enemy,
                config,
                now
            );
        }

        // ==================================
        // WHEEL ROTATION ANIMATION
        // ==================================

        kart.children.forEach((child) => {

            if (child.name === "kartWheel") {

                child.rotation.x -=
                    (bot.speed / 0.48) * dt;
            }

        });

    });

    // ======================================
    // RENDER BOT KART
    // ======================================

    return (

        <group>

            <Kart
                ref={kartRef}
                position={[0, 0, 0]}
                color={config.color}
                helmetColor={config.helmetColor}
                suitColor={config.suitColor}
                entity={bot}
            />

            <BotLabel
                bot={bot}
                healthRef={healthRef}
                labelRef={labelRef}
            />

        </group>
    );
}

// ==========================================
// BOT NAME AND HEALTH BAR
// ==========================================

function BotLabel({

    bot,

    healthRef,

    labelRef,

}) {

    const ref = useRef();

    useFrame(() => {

        if (!ref.current) return;

        ref.current.position.set(
            bot.x,
            3.3,
            bot.z
        );

    });

    return (

        <group ref={ref}>

            <Html
                center
                distanceFactor={15}
            >

                <div
                    ref={labelRef}
                    style={{
                        width: "100px",
                        textAlign: "center",
                        pointerEvents: "none",
                        userSelect: "none",
                        display: "none",
                    }}
                >

                    {/* BOT NAME */}

                    <div style={{
                        color: "#ffffff",
                        fontSize: "12px",
                        fontWeight: "bold",
                        marginBottom: "5px",
                        textShadow: "0 2px 4px #000",
                    }}>

                        {bot.name}

                    </div>

                    {/* HEALTH BAR BACKGROUND */}

                    <div style={{
                        height: "7px",
                        background: "#252525",
                        border: "1px solid #ffffff",
                        borderRadius: "4px",
                        overflow: "hidden",
                    }}>

                        {/* HEALTH BAR VALUE */}

                        <div
                            ref={healthRef}
                            style={{
                                width: "100%",
                                height: "100%",
                                background: "#39e75f",
                            }}
                        />

                    </div>

                </div>

            </Html>

        </group>
    );
}