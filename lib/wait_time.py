from typing import Optional

BASE_WAIT_MINUTES = 30


def estimate_wait(busyness_score: Optional[int], doctor_count: int) -> Optional[int]:
    if busyness_score is None:
        return None
    doctor_count = max(doctor_count, 1)
    return max(1, int((busyness_score / 100) * BASE_WAIT_MINUTES * (1 / doctor_count)))
