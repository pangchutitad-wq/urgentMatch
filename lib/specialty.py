SPECIALTY_KEYWORDS = {
    "orthopedic": ["sprain", "fracture", "broken", "back", "joint", "swollen", "ankle", "knee", "shoulder", "elbow", "wrist", "hip", "leg", "foot", "toe"],
    "respiratory": ["sneeze", "sneezing", "sore throat", "mucus", "cough", "congestion", "flu", "shortness of breath", "chest pain", "difficulty breathing"],
    "gastrointestinal": ["nausea", "vomiting", "diarrhea", "constipation", "abdominal pain", "heartburn", "gas"],
    "dermatology": ["face", "skin", "acne", "eczema", "psoriasis", "rosacea", "dermatitis", "pimple", "blackhead", "whitehead"],
    "pediatric": ["child", "infant", "toddler", "baby", "kid", "son", "daughter", "month old", "year old", "teen", "teenager"],
}

def get_specialty(text: str) -> str:
    for specialty, keywords in SPECIALTY_KEYWORDS.items():
        if any(keyword in text.lower() for keyword in keywords):
            return specialty
    return "general"