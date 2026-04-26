import random

NAME_KEYWORDS: dict[str, list[str]] = {
    "orthopedic": ["ortho", "bone", "joint", "spine", "sport"],
    "respiratory": ["respir", "pulmon", "lung"],
    "gastrointestinal": ["gastro", "digest"],
    "dermatology": ["dermat", "skin"],
    "pediatric": ["pediatr", "child", "kid"],
}

ALL_SPECIALTIES = ["general", "orthopedic", "respiratory", "gastrointestinal", "dermatology", "pediatric"]


def infer_clinic_specialties(name: str, seed: int | None = None) -> list[str]:
    """
    Determine which specialties a clinic handles.
    Locks in keyword-based matches from the clinic name, then randomly
    sprinkles in 1-2 extras so clinics have realistic variety.
    """
    rng = random.Random(seed if seed is not None else random.randint(0, 2**32))
    n = name.lower()

    locked: list[str] = ["general"]
    for specialty, kws in NAME_KEYWORDS.items():
        if any(k in n for k in kws):
            if specialty not in locked:
                locked.append(specialty)

    extras = [s for s in ALL_SPECIALTIES if s not in locked]
    num_extras = rng.randint(1, 2)
    locked.extend(rng.sample(extras, min(num_extras, len(extras))))
    return locked