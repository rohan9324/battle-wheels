import { useEffect, useState } from "react";

import playerState from "../PlayerState";

import matchState from "../match/MatchState";

import {
    canEntityFire,
} from "../combat/SpecialWeaponSystem";

import "./WeaponHUD.css";

// ==========================================
// HUD SETTINGS
// ==========================================

const HUD_REFRESH_INTERVAL = 100;

const PICKUP_MESSAGE_DURATION = 2500;

// ==========================================
// GET WEAPON TYPE LABEL
// ==========================================

function getWeaponType(weapon) {

    if (!weapon) {

        return "NO WEAPON";
    }

    if (weapon.powerUp) {

        return "POWER-UP";
    }

    if (weapon.deployable) {

        return "DEPLOYABLE WEAPON";
    }

    if (weapon.melee) {

        return "MELEE WEAPON";
    }

    if (weapon.homing) {

        return "HOMING WEAPON";
    }

    if (weapon.type === "pellet") {

        return "SPREAD WEAPON";
    }

    if (weapon.type === "emp") {

        return "EMP WEAPON";
    }

    if (weapon.type === "poison") {

        return "AREA DAMAGE WEAPON";
    }

    if (weapon.burstCount > 1) {

        return "BURST WEAPON";
    }

    return "PROJECTILE WEAPON";
}

// ==========================================
// GET LIVE WEAPON HUD DATA
// ==========================================

function getWeaponSnapshot() {

    const now = performance.now();

    const alive = playerState.alive !== false;

    const matchPlaying =

        matchState.status === "playing";

    const weapon = alive

        ? playerState.weapon

        : null;

    const ammo = alive

        ? Math.max(0, Number(playerState.ammo) || 0)

        : 0;

    const maxAmmo = alive

        ? Math.max(0, Number(playerState.maxAmmo) || 0)

        : 0;

    const firing =

        alive && Boolean(playerState.firing);

    const empRemaining = Math.max(

        0,

        (Number(playerState.empUntil) || 0) - now
    );

    const stunRemaining = Math.max(

        0,

        (Number(playerState.stunUntil) || 0) - now
    );

    const maceRemaining = Math.max(

        0,

        (Number(playerState.maceUntil) || 0) - now
    );

    const showMessage =

        alive &&

        matchPlaying &&

        Boolean(playerState.pickupMessage) &&

        now - playerState.pickupTime <
            PICKUP_MESSAGE_DURATION;

    return {

        alive,

        matchPlaying,

        matchStatus: matchState.status,

        weapon,

        ammo,

        maxAmmo,

        firing,

        empDisabled: alive && empRemaining > 0,

        empSeconds: Math.ceil(
            empRemaining / 1000
        ),

        stunned: alive && stunRemaining > 0,

        stunSeconds: Math.ceil(
            stunRemaining / 1000
        ),

        maceActive: alive && maceRemaining > 0,

        maceSeconds: Math.ceil(
            maceRemaining / 1000
        ),

        canFire:

            matchPlaying &&

            alive &&

            canEntityFire(playerState) &&

            Boolean(weapon) &&

            ammo > 0 &&

            !firing,

        message: showMessage

            ? playerState.pickupMessage

            : "",
    };
}

// ==========================================
// GET WEAPON CONTROL HINT
// ==========================================

function getWeaponHint(hud) {

    if (!hud.alive) {

        return "WAITING FOR RESPAWN";
    }

    if (!hud.matchPlaying) {

        return "MATCH NOT ACTIVE";
    }

    // Electric stun disables firing and movement.

    if (hud.stunned) {

        return `STUNNED - ${hud.stunSeconds}s`;
    }

    // EMP disables weapon firing.

    if (hud.empDisabled) {

        return `EMP DISABLED - ${hud.empSeconds}s`;
    }

    // Spinning Mace is already activated.

    if (hud.maceActive) {

        return `MACE ACTIVE - ${hud.maceSeconds}s`;
    }

    // Weapon is currently firing.

    if (hud.firing) {

        return "FIRING...";
    }

    // Player does not have a weapon.

    if (!hud.weapon || hud.ammo <= 0) {

        return "COLLECT A MYSTERY BOX";
    }

    // Deployable weapons.

    if (hud.weapon.deployable) {

        return "PRESS SPACE TO DEPLOY";
    }

    // Power-up and melee weapons.

    if (
        hud.weapon.powerUp ||
        hud.weapon.melee
    ) {

        return "PRESS SPACE TO ACTIVATE";
    }

    // Normal projectile weapons.

    if (hud.canFire) {

        return "PRESS SPACE TO FIRE";
    }

    return "WEAPON UNAVAILABLE";
}

// ==========================================
// GET AMMO LABEL
// ==========================================

function getAmmoLabel(weapon) {

    if (!weapon) {

        return "AMMO";
    }

    if (
        weapon.powerUp ||
        weapon.melee ||
        weapon.deployable
    ) {

        return "USES";
    }

    return "AMMO";
}

// ==========================================
// GET WEAPON HUD COLOR
// ==========================================

function getHUDColor(hud) {

    if (!hud.alive) {

        return "#8793a5";
    }

    if (hud.stunned) {

        return "#c084fc";
    }

    if (hud.empDisabled) {

        return "#818cf8";
    }

    return hud.weapon?.color || "#8793a5";
}

// ==========================================
// MAIN WEAPON HUD
// ==========================================

export default function WeaponHUD() {

    const [hud, setHud] = useState(

        getWeaponSnapshot
    );

    // ======================================
    // LIVE HUD REFRESH
    // ======================================

    useEffect(() => {

        const timer = window.setInterval(() => {

            setHud(getWeaponSnapshot());

        }, HUD_REFRESH_INTERVAL);

        return () => {

            window.clearInterval(timer);
        };

    }, []);

    // ======================================
    // HIDE HUD BEFORE AND AFTER MATCH
    // ======================================

    if (

        hud.matchStatus === "waiting" ||

        hud.matchStatus === "finished"

    ) {

        return null;
    }

    // ======================================
    // CALCULATE AMMO PERCENTAGE
    // ======================================

    const ammoPercent = hud.maxAmmo > 0

        ? Math.max(

            0,

            Math.min(

                100,

                (hud.ammo / hud.maxAmmo) * 100
            )
        )

        : 0;

    const weaponColor = getHUDColor(hud);

    const weaponHint = getWeaponHint(hud);

    const weaponType = getWeaponType(hud.weapon);

    const ammoLabel = getAmmoLabel(hud.weapon);

    const weaponDisabled =

        hud.stunned || hud.empDisabled;

    // ======================================
    // WEAPON HUD DESIGN
    // ======================================

    return (

        <>

            {/* Weapon pickup notification */}

            {hud.message && (

                <div className="weapon-pickup-message">

                    <span>

                        WEAPON ACQUIRED

                    </span>

                    <strong>

                        {hud.message}

                    </strong>

                </div>

            )}

            {/* Main weapon HUD */}

            <div
                className="weapon-hud"
                style={{
                    "--weapon-color": weaponColor,
                }}
            >

                <div className="weapon-hud-label">

                    CURRENT WEAPON

                </div>

                {/* Weapon name */}

                <div className="weapon-hud-name">

                    {hud.weapon?.name || "No Weapon"}

                </div>

                {/* Weapon type */}

                {hud.weapon && (

                    <div
                        style={{
                            fontSize: "8px",
                            fontWeight: "800",
                            letterSpacing: "0.5px",
                            color: weaponColor,
                            marginTop: "3px",
                            marginBottom: "6px",
                            opacity: 0.85,
                        }}
                    >

                        {weaponType}

                    </div>

                )}

                {/* Ammo information */}

                <div className="weapon-ammo-row">

                    <span>

                        {ammoLabel}

                    </span>

                    <strong>

                        {hud.ammo} / {hud.maxAmmo}

                    </strong>

                </div>

                {/* Ammo progress bar */}

                <div className="weapon-ammo-track">

                    <div
                        className="weapon-ammo-fill"
                        style={{
                            width: `${ammoPercent}%`,
                            opacity: weaponDisabled
                                ? 0.45
                                : 1,
                        }}
                    />

                </div>

                {/* Weapon controls and live status */}

                <div
                    className="weapon-hud-hint"
                    style={{
                        color: weaponDisabled
                            ? weaponColor
                            : undefined,

                        fontWeight: weaponDisabled
                            ? "900"
                            : undefined,
                    }}
                >

                    {weaponHint}

                </div>

                {/* Active firing indicator */}

                {hud.firing &&
                    !hud.maceActive &&
                    !weaponDisabled && (

                    <div
                        style={{
                            marginTop: "5px",
                            fontSize: "8px",
                            fontWeight: "900",
                            color: weaponColor,
                            textAlign: "center",
                            letterSpacing: "1px",
                        }}
                    >

                        WEAPON IN USE

                    </div>

                )}

            </div>

        </>
    );
}