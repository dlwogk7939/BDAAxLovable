from datetime import datetime

ETHANOL_DENSITY = 0.789
ELIMINATION_RATE_PER_HOUR = 0.015
HYDRATION_DECAY_MINUTES = 60
SNACK_EFFECT_WINDOW_MINUTES = 90


def minutes_between(ts: datetime):
    return (datetime.utcnow() - ts).total_seconds() / 60


def compute_bac(session, drinks, hydration_entries, snack_entries):
    weight_kg = session.user.weight_kg
    weight_grams = weight_kg * 1000
    dist = session.user.body_ratio

    alcohol_g = sum(d.alcohol_grams for d in drinks)

    if alcohol_g > 0:
        bac_before = (alcohol_g / (weight_grams * dist)) * 100
    else:
        bac_before = 0

    hours = (datetime.utcnow() - session.start_time).total_seconds() / 3600

    bac = max(0, bac_before - ELIMINATION_RATE_PER_HOUR * hours)

    # Hydration
    hydration_score = 0
    for h in hydration_entries:
        mins = minutes_between(h.timestamp)
        if mins <= HYDRATION_DECAY_MINUTES:
            hydration_score += h.volume_ml * (1 - mins / HYDRATION_DECAY_MINUTES)

    hydration_modifier = (
        0.9 if hydration_score >= 800 else
        1.0 if hydration_score >= 400 else
        1.15
    )

    # Snack
    if snack_entries:
        recent = snack_entries[-1]
        mins = minutes_between(recent.timestamp)
        snack_modifier = recent.modifier if mins <= SNACK_EFFECT_WINDOW_MINUTES else 1.0
    else:
        snack_modifier = 1.0

    # Rest time
    if bac > 0:
        baseline = ((bac * 0.3) / ELIMINATION_RATE_PER_HOUR) * 60
    else:
        baseline = 0

    adjusted_rest = max(1, round(baseline * hydration_modifier * snack_modifier))

    return {
        "bac": round(bac, 4),
        "hydration_score": hydration_score,
        "hydration_modifier": hydration_modifier,
        "snack_modifier": snack_modifier,
        "baseline_rest_minutes": baseline,
        "rest_minutes": adjusted_rest,
        "hours_since_start": round(hours, 2)
    }
