def score_clinic(clinic: Clinic, specialty: str, user_lat: float, user_lon: float) -> float:
    distance = haversine(user_lat, user_lon, clinic.lat, clinic.lon)
    if distance > 15: 
        return None
    if specialty in clinic.specialties:
        specialtyMatch = 1.0
    else:
        specialtyMatch = 0
    
    #lower score = less busy, better score
    #min to ensure 1 - var doesnt go negative in score calculation
    loadFactor = min(clinic.current_patients / clinic.capacity, 1)
    normalizedETA = min(clinic.eta_minutes / 90, 1) #anything above 90 gets 0 
    
    score = specialtyMatch * 0.4 + (1-loadFactor) * 0.3 + (1-normalizedETA) * 0.3
    return score