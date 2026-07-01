from app.services.geocode import get_directions, meters_to_miles, seconds_to_minutes


def calculate_trip_cost(
    distance_miles: float,
    duration_minutes: float,
    cost_settings: dict,
    round_trip: bool = True,
) -> dict:
    multiplier = 2 if round_trip else 1
    miles = distance_miles * multiplier
    minutes = duration_minutes * multiplier

    gas_price = cost_settings.get("gasPricePerGallon", 3.5)
    mpg = cost_settings.get("mpg", 25.0)
    include_maintenance = cost_settings.get("includeMaintenance", False)
    maintenance_per_mile = cost_settings.get("maintenancePerMile", 0.1)
    include_time_value = cost_settings.get("includeTimeValue", False)
    hourly_rate = cost_settings.get("hourlyRate", 20.0)

    gas_cost = (miles / mpg) * gas_price if mpg > 0 else 0
    maintenance_cost = miles * maintenance_per_mile if include_maintenance else 0
    time_cost = (minutes / 60) * hourly_rate if include_time_value else 0
    trip_cost = gas_cost + maintenance_cost + time_cost

    return {
        "distance_miles": miles,
        "duration_minutes": minutes,
        "gas_cost": round(gas_cost, 2),
        "trip_cost": round(trip_cost, 2),
    }


def analyze_job_worth_it(
    trip_cost: float,
    job_pay: float,
    duration_minutes: float,
    cost_settings: dict,
) -> dict:
    """Worth-it analysis for a Sweeps job: compare pay vs drive cost."""
    drive_hours = duration_minutes / 60 if duration_minutes > 0 else 0
    net_profit = job_pay - trip_cost

    side_hustle_rate = cost_settings.get("sideHustleRate", 20.0)
    include_side_hustle = cost_settings.get("includeSideHustle", True)

    mood = "meh"
    headline = "BORDERLINE"
    subline = "Pay barely covers the drive. Your call."

    if net_profit < 0:
        mood = "bad"
        headline = "NOT WORTH IT"
        subline = f"You'd lose ${abs(net_profit):.2f} after gas. Hard pass."
    elif net_profit >= job_pay * 0.5:
        mood = "good"
        headline = "WORTH IT"
        subline = f"Net ~${net_profit:.2f} after drive costs. Send it."
    elif net_profit > 0:
        mood = "meh"
        headline = "BORDERLINE"
        subline = f"Only ~${net_profit:.2f} profit after gas. Meh."

    if include_side_hustle and side_hustle_rate > 0 and drive_hours > 0:
        opportunity_cost = drive_hours * side_hustle_rate
        if job_pay < opportunity_cost + trip_cost:
            mood = "bad"
            headline = "NOT WORTH IT"
            subline = (
                f"${job_pay:.0f} pay < ${opportunity_cost:.0f} drive time "
                f"+ ${trip_cost:.2f} gas. Skip."
            )

    return {
        "worth_it_mood": mood,
        "worth_it_headline": headline,
        "worth_it_subline": subline,
        "net_profit": round(net_profit, 2),
    }


async def compute_commute(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    cost_settings: dict,
    job_pay: float,
    round_trip: bool = True,
) -> dict:
    route = await get_directions([(origin_lng, origin_lat), (dest_lng, dest_lat)])
    distance_miles = meters_to_miles(route["distance_meters"])
    duration_minutes = seconds_to_minutes(route["duration_seconds"])

    costs = calculate_trip_cost(distance_miles, duration_minutes, cost_settings, round_trip)
    worth = analyze_job_worth_it(
        costs["trip_cost"], job_pay, costs["duration_minutes"], cost_settings
    )

    return {
        **costs,
        **worth,
        "geometry": route.get("geometry"),
    }
