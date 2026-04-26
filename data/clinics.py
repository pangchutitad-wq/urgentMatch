import random
from lib.models import Clinic

# Mock LA-area urgent care clinics with real addresses
# Real data: name, address, lat, lon, rating
# Simulated data: specialties, current_patients, capacity, eta_minutes, doctors_on_duty
# Simulated data is randomized on each call to simulate live updates

def generate_simulated_data():
    """Generate randomized simulated data for live updates."""
    return {
        "current_patients": random.randint(5, 20),
        "capacity": 20,
        "eta_minutes": random.randint(10, 70),
        "doctors_on_duty": random.randint(2, 4),
    }

def get_clinics():
    """Return list of clinics with fresh simulated data."""
    base_clinics = [
        {
            "name": "CityMD Urgent Care West Hollywood",
            "address": "8735 Santa Monica Blvd, West Hollywood, CA 90069",
            "lat": 34.0900,
            "lon": -118.3850,
            "specialties": ["general", "respiratory", "gastrointestinal"],
            "rating": 4.2,
            "review_count": 1823,
            "open_now": True,
        },
        {
            "name": "MedPost Urgent Care – Silver Lake",
            "address": "2918 Rowena Ave, Los Angeles, CA 90039",
            "lat": 34.1130,
            "lon": -118.2650,
            "specialties": ["general", "pediatric"],
            "rating": 4.4,
            "review_count": 290,
            "open_now": True,
        },
        {
            "name": "Cedars-Sinai Urgent Care – Beverly Hills",
            "address": "8733 Beverly Blvd, Los Angeles, CA 90048",
            "lat": 34.0760,
            "lon": -118.3770,
            "specialties": ["general", "orthopedic"],
            "rating": 4.1,
            "review_count": 774,
            "open_now": True,
        },
        {
            "name": "UCLA Health Urgent Care – Santa Monica",
            "address": "2428 Santa Monica Blvd, Santa Monica, CA 90404",
            "lat": 34.0330,
            "lon": -118.4770,
            "specialties": ["general", "dermatology"],
            "rating": 4.3,
            "review_count": 456,
            "open_now": True,
        },
        {
            "name": "Providence Urgent Care – Burbank",
            "address": "191 S Buena Vista St, Burbank, CA 91505",
            "lat": 34.1808,
            "lon": -118.3290,
            "specialties": ["general", "respiratory", "pediatric"],
            "rating": 4.0,
            "review_count": 312,
            "open_now": True,
        },
        {
            "name": "Adventist Health Urgent Care – Glendale",
            "address": "1509 Wilson Terrace, Glendale, CA 91206",
            "lat": 34.1625,
            "lon": -118.2556,
            "specialties": ["general", "orthopedic", "gastrointestinal"],
            "rating": 4.2,
            "review_count": 589,
            "open_now": True,
        },
        {
            "name": "Carbon Health Urgent Care – Los Angeles",
            "address": "1245 Wilshire Blvd, Los Angeles, CA 90017",
            "lat": 34.0497,
            "lon": -118.2661,
            "specialties": ["general", "respiratory", "dermatology"],
            "rating": 4.5,
            "review_count": 1120,
            "open_now": True,
        },
        {
            "name": "Healthway Medical – Koreatown",
            "address": "3580 Wilshire Blvd #100, Los Angeles, CA 90010",
            "lat": 34.0617,
            "lon": -118.3095,
            "specialties": ["general", "pediatric", "gastrointestinal"],
            "rating": 3.9,
            "review_count": 267,
            "open_now": True,
        },
    ]
    
    # Add simulated data to each clinic
    clinics = []
    for data in base_clinics:
        simulated = generate_simulated_data()
        clinics.append(
            Clinic(
                name=data["name"],
                address=data["address"],
                lat=data["lat"],
                lon=data["lon"],
                specialties=data["specialties"],
                current_patients=simulated["current_patients"],
                capacity=simulated["capacity"],
                eta_minutes=simulated["eta_minutes"],
                rating=data["rating"],
                open_now=data["open_now"],
                place_id="",  # Not used since these are mock clinics
            )
        )
    
    return clinics